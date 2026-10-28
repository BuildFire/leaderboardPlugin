// scores: the leaderboard's four boards (today, this week, this month, overall) and every operation on a person's score.
const call = (operation, parameters) => new Promise((resolve, reject) => contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
const reason = (error) => String((error && error.message) || error);
// The reason a call was refused; fails the spec when the call succeeds.
const refusal = (promise) => promise.then(() => fail('expected the call to be refused'), reason);
const PERIODS = ['daily', 'weekly', 'monthly', 'overall'];
// Every score change reads and writes all four boards, one after another: each spec gets the time that takes.
const SLOW = 120000;
const NO_ONE = '000000000000000000000000';
// A second person for the specs that need two on a board: a changed copy of this host's user, signed in to act for them.
const otherPerson = () => ({
  ...contract.user,
  _id: contract.host === 'control' ? '6ad6624a418cfa5ac8b30001' : '6ad6624a418cfa5ac8b30002',
  email: `someone.else.${contract.host}@example.com`,
});
// The person's score on each board, as the contract's own read shows it: 0 when they are not on it.
const scoresOf = async (user) => {
  const boards = await Promise.all(PERIODS.map((period) => call('listScores', { period, user })));
  return boards.map(({ scores }) => (scores.length ? scores[0].currentScore : 0));
};
const plus = (scores, points) => scores.map((score) => score + points);
// The scores a daily edit leaves: today's becomes the new score, the others move by the same difference.
const edited = ([daily, weekly, monthly, overall], newScore) => [newScore, weekly - daily + newScore, monthly - daily + newScore, overall - daily + newScore];
const asResult = ([dailyScore, weeklyScore, monthlyScore, overallScore]) => ({
  dailyScore, weeklyScore, monthlyScore, overallScore,
});
const signedIn = () => {
  beforeEach(() => contract.signIn(contract.user));
  afterEach(() => contract.signOut());
};
// The event the score changes declare is asserted; analytics is the plugin's own bookkeeping, so its spy only answers.
const spyOnSideEffects = () => {
  beforeEach(() => {
    spyOn(buildfire.services.contract.events, 'send').and.callFake((eventName, data, callback) => callback && callback(null, []));
    spyOn(buildfire.analytics, 'trackAction');
  });
};

contract.describe('listScores', () => {
  signedIn();
  spyOnSideEffects();

  it('shows the overall leaderboard when no period is given, with each person\'s place', async () => {
    await call('updateUserScore', { user: contract.user._id, points: 3 });
    const board = await call('listScores', {});
    expect(board.period).toBe('overall');
    expect(board.scores).toContain(jasmine.objectContaining({
      rank: jasmine.any(Number),
      userId: contract.user._id,
      displayName: jasmine.any(String),
      currentScore: jasmine.any(Number),
      displayPictureUrl: jasmine.any(String),
      createdOn: jasmine.any(String),
    }));
  }, SLOW);

  it('lists every board highest score first, numbered from 1', async () => {
    const other = otherPerson();
    await contract.signIn(other);
    await call('updateUserScore', { user: other._id, points: 1 });
    await contract.signIn(contract.user);
    await call('updateUserScore', { user: contract.user._id, points: 2 });
    const boards = await Promise.all(PERIODS.map((period) => call('listScores', { period })));
    boards.forEach((board, index) => {
      expect(board.period).toBe(PERIODS[index]);
      const userIds = board.scores.map((score) => score.userId);
      expect(userIds).toEqual(jasmine.arrayContaining([contract.user._id, other._id]));
      board.scores.forEach((score, place) => {
        expect(score.rank).toBe(place + 1);
        if (place > 0) expect(score.currentScore).not.toBeGreaterThan(board.scores[place - 1].currentScore);
      });
    });
  }, SLOW);

  it('narrows to one person, by id or by email', async () => {
    await call('updateUserScore', { user: contract.user._id, points: 1 });
    const byId = await call('listScores', { period: 'daily', user: contract.user._id });
    expect(byId.scores).toEqual([jasmine.objectContaining({ userId: contract.user._id })]);
    const byEmail = await call('listScores', { period: 'daily', user: contract.user.email });
    expect(byEmail.scores).toEqual([jasmine.objectContaining({ userId: contract.user._id, currentScore: byId.scores[0].currentScore })]);
  }, SLOW);

  it('finds nobody for a person not on the leaderboard', async () => {
    expect((await call('listScores', { period: 'weekly', user: NO_ONE })).scores).toEqual([]);
  });

  it('changes nothing', async () => {
    const before = await scoresOf(contract.user._id);
    await call('listScores', { period: 'monthly' });
    expect(await scoresOf(contract.user._id)).toEqual(before);
  }, SLOW);

  describe('refuses', () => {
    it('a period it does not offer', async () => {
      expect(await refusal(call('listScores', { period: 'yearly' }))).toContain('period');
    });

    it('an empty person', async () => {
      expect(await refusal(call('listScores', { user: '' }))).toContain('user');
    });
  });
});

contract.describe('updateUserScore', () => {
  signedIn();
  spyOnSideEffects();

  it('adds the points to every board, and returns the new scores', async () => {
    const before = await scoresOf(contract.user._id);
    const result = await call('updateUserScore', { user: contract.user._id, points: 7 });
    expect(result).toEqual(jasmine.objectContaining({ userId: contract.user._id, displayName: jasmine.any(String), ...asResult(plus(before, 7)) }));
    expect(await scoresOf(contract.user._id)).toEqual(plus(before, 7));
  }, SLOW);

  it('names the person by email', async () => {
    const before = await scoresOf(contract.user._id);
    expect(await call('updateUserScore', { user: contract.user.email, points: 2 })).toEqual(jasmine.objectContaining({ userId: contract.user._id }));
    expect(await scoresOf(contract.user._id)).toEqual(plus(before, 2));
  }, SLOW);

  it('announces the change', async () => {
    const before = await scoresOf(contract.user._id);
    buildfire.services.contract.events.send.calls.reset();
    await call('updateUserScore', { user: contract.user._id, points: 3 });
    expect(buildfire.services.contract.events.send.calls.argsFor(0).slice(0, 2)).toEqual(['scoreUpdated', jasmine.objectContaining({
      user: jasmine.objectContaining({ userId: contract.user._id }),
      changeType: 'add',
      points: 3,
      ...asResult(plus(before, 3)),
    })]);
  }, SLOW);

  describe('refuses, changes no score and announces nothing', () => {
    let before;
    beforeEach(async () => {
      before = await scoresOf(contract.user._id);
      buildfire.services.contract.events.send.calls.reset();
    }, SLOW);
    afterEach(async () => {
      expect(buildfire.services.contract.events.send).not.toHaveBeenCalled();
      expect(await scoresOf(contract.user._id)).toEqual(before);
    }, SLOW);

    it('without a person', async () => {
      expect(await refusal(call('updateUserScore', { points: 5 }))).toContain('user');
    });

    it('with no person', async () => {
      expect(await refusal(call('updateUserScore', { user: null, points: 5 }))).toContain('user');
    });

    it('with an empty person', async () => {
      expect(await refusal(call('updateUserScore', { user: '', points: 5 }))).toContain('user');
    });

    it('without points', async () => {
      expect(await refusal(call('updateUserScore', { user: contract.user._id }))).toContain('points');
    });

    it('with no points', async () => {
      expect(await refusal(call('updateUserScore', { user: contract.user._id, points: null }))).toContain('points');
    });

    it('with points that are not a number', async () => {
      expect(await refusal(call('updateUserScore', { user: contract.user._id, points: '5' }))).toContain('points');
    });

    it('with points below 1', async () => {
      expect(await refusal(call('updateUserScore', { user: contract.user._id, points: 0 }))).toContain('points');
    });

    it('with points that are not a whole number', async () => {
      expect(await refusal(call('updateUserScore', { user: contract.user._id, points: 2.5 }))).toContain('points');
    });

    it('for an id no person has', async () => {
      expect(await refusal(call('updateUserScore', { user: NO_ONE, points: 5 }))).toContain(NO_ONE);
    });

    it('for an email no person has', async () => {
      const email = `nobody.${contract.host}.${Date.now()}@example.com`;
      expect(await refusal(call('updateUserScore', { user: email, points: 5 }))).toContain(email);
    });
  });
});

contract.describe('updateUserScoresAdvanced', () => {
  signedIn();
  spyOnSideEffects();

  it('adds the points of every entry, and reports each', async () => {
    const before = await scoresOf(contract.user._id);
    expect(await call('updateUserScoresAdvanced', { scores: [{ user: contract.user._id, points: 4 }] })).toEqual(jasmine.objectContaining({
      scores: [jasmine.objectContaining({ index: 0, id: contract.user._id })],
      succeeded: 1,
      failed: 0,
    }));
    expect(await scoresOf(contract.user._id)).toEqual(plus(before, 4));
    expect(buildfire.services.contract.events.send).toHaveBeenCalledWith('scoreUpdated', jasmine.objectContaining({ changeType: 'add', points: 4 }));
  }, SLOW);

  describe('refuses the whole list, and changes no score', () => {
    let before;
    beforeEach(async () => {
      before = await scoresOf(contract.user._id);
      buildfire.services.contract.events.send.calls.reset();
    }, SLOW);
    afterEach(async () => {
      expect(buildfire.services.contract.events.send).not.toHaveBeenCalled();
      expect(await scoresOf(contract.user._id)).toEqual(before);
    }, SLOW);

    it('without a list', async () => {
      expect(await refusal(call('updateUserScoresAdvanced', {}))).toContain('scores');
    });

    it('when it is empty', async () => {
      await expectAsync(call('updateUserScoresAdvanced', { scores: [] })).toBeRejected();
    });

    it('when it holds more than 50 entries', async () => {
      const scores = Array.from({ length: 51 }, () => ({ user: contract.user._id, points: 1 }));
      await expectAsync(call('updateUserScoresAdvanced', { scores })).toBeRejected();
    });

    it('when one entry is invalid', async () => {
      const scores = [{ user: contract.user._id, points: 3 }, { user: contract.user._id, points: 0 }];
      expect(await refusal(call('updateUserScoresAdvanced', { scores }))).toContain('points');
    });

    it('when one entry names nobody', async () => {
      const scores = [{ user: contract.user._id, points: 3 }, { user: NO_ONE, points: 3 }];
      expect(await refusal(call('updateUserScoresAdvanced', { scores }))).toContain(NO_ONE);
    });

    it('when the same person is listed twice', async () => {
      const scores = [{ user: contract.user._id, points: 3 }, { user: contract.user.email, points: 3 }];
      await expectAsync(call('updateUserScoresAdvanced', { scores })).toBeRejected();
    });
  });
});

contract.describe('updateUserDailyScore', () => {
  signedIn();
  spyOnSideEffects();

  it('sets today\'s score and moves the other boards by the same amount', async () => {
    const before = await scoresOf(contract.user._id);
    const result = await call('updateUserDailyScore', { user: contract.user._id, newScore: 4 });
    expect(result).toEqual(jasmine.objectContaining({ userId: contract.user._id, ...asResult(edited(before, 4)) }));
    expect(await scoresOf(contract.user._id)).toEqual(edited(before, 4));
  }, SLOW);

  it('announces the change', async () => {
    const before = await scoresOf(contract.user._id);
    buildfire.services.contract.events.send.calls.reset();
    await call('updateUserDailyScore', { user: contract.user._id, newScore: 9 });
    expect(buildfire.services.contract.events.send.calls.argsFor(0).slice(0, 2)).toEqual(['scoreUpdated', jasmine.objectContaining({
      user: jasmine.objectContaining({ userId: contract.user._id }),
      changeType: 'edit',
      points: 9,
      ...asResult(edited(before, 9)),
    })]);
  }, SLOW);

  describe('refuses, changes no score and announces nothing', () => {
    let before;
    beforeEach(async () => {
      before = await scoresOf(contract.user._id);
      buildfire.services.contract.events.send.calls.reset();
    }, SLOW);
    afterEach(async () => {
      expect(buildfire.services.contract.events.send).not.toHaveBeenCalled();
      expect(await scoresOf(contract.user._id)).toEqual(before);
    }, SLOW);

    it('without a person', async () => {
      expect(await refusal(call('updateUserDailyScore', { newScore: 5 }))).toContain('user');
    });

    it('with no person', async () => {
      expect(await refusal(call('updateUserDailyScore', { user: null, newScore: 5 }))).toContain('user');
    });

    it('with an empty person', async () => {
      expect(await refusal(call('updateUserDailyScore', { user: '', newScore: 5 }))).toContain('user');
    });

    it('without a score', async () => {
      expect(await refusal(call('updateUserDailyScore', { user: contract.user._id }))).toContain('newScore');
    });

    it('with no score', async () => {
      expect(await refusal(call('updateUserDailyScore', { user: contract.user._id, newScore: null }))).toContain('newScore');
    });

    it('with a score that is not a number', async () => {
      expect(await refusal(call('updateUserDailyScore', { user: contract.user._id, newScore: '5' }))).toContain('newScore');
    });

    it('with a score that is not a whole number', async () => {
      expect(await refusal(call('updateUserDailyScore', { user: contract.user._id, newScore: 1.5 }))).toContain('newScore');
    });

    it('for an id no person has', async () => {
      expect(await refusal(call('updateUserDailyScore', { user: NO_ONE, newScore: 5 }))).toContain(NO_ONE);
    });
  });
});

contract.describe('updateUserDailyScoresAdvanced', () => {
  signedIn();
  spyOnSideEffects();

  it('sets today\'s score of every entry, and reports each', async () => {
    const before = await scoresOf(contract.user._id);
    expect(await call('updateUserDailyScoresAdvanced', { scores: [{ user: contract.user._id, newScore: 6 }] })).toEqual(jasmine.objectContaining({
      scores: [jasmine.objectContaining({ index: 0, id: contract.user._id })],
      succeeded: 1,
      failed: 0,
    }));
    expect(await scoresOf(contract.user._id)).toEqual(edited(before, 6));
    expect(buildfire.services.contract.events.send).toHaveBeenCalledWith('scoreUpdated', jasmine.objectContaining({ changeType: 'edit', points: 6 }));
  }, SLOW);

  describe('refuses the whole list, and changes no score', () => {
    let before;
    beforeEach(async () => {
      before = await scoresOf(contract.user._id);
      buildfire.services.contract.events.send.calls.reset();
    }, SLOW);
    afterEach(async () => {
      expect(buildfire.services.contract.events.send).not.toHaveBeenCalled();
      expect(await scoresOf(contract.user._id)).toEqual(before);
    }, SLOW);

    it('when it is empty', async () => {
      await expectAsync(call('updateUserDailyScoresAdvanced', { scores: [] })).toBeRejected();
    });

    it('when it holds more than 50 entries', async () => {
      const scores = Array.from({ length: 51 }, () => ({ user: contract.user._id, newScore: 1 }));
      await expectAsync(call('updateUserDailyScoresAdvanced', { scores })).toBeRejected();
    });

    it('when one entry is invalid', async () => {
      const scores = [{ user: contract.user._id, newScore: 3 }, { user: contract.user._id, newScore: 'high' }];
      expect(await refusal(call('updateUserDailyScoresAdvanced', { scores }))).toContain('newScore');
    });

    it('when one entry names nobody', async () => {
      const scores = [{ user: contract.user._id, newScore: 3 }, { user: NO_ONE, newScore: 3 }];
      expect(await refusal(call('updateUserDailyScoresAdvanced', { scores }))).toContain(NO_ONE);
    });

    it('when the same person is listed twice', async () => {
      const scores = [{ user: contract.user._id, newScore: 3 }, { user: contract.user._id, newScore: 4 }];
      await expectAsync(call('updateUserDailyScoresAdvanced', { scores })).toBeRejected();
    });
  });
});

// controlBackground only: this block runs in the control frame.
contract.describe('resetLeaderboard', () => {
  signedIn();
  spyOnSideEffects();
  // The reload message to the widget is the plugin's own bookkeeping, which the manifest never mentions: the spy only answers.
  beforeEach(() => spyOn(buildfire.messaging, 'sendMessageToWidget'));

  it('clears every board', async () => {
    await call('updateUserScore', { user: contract.user._id, points: 5 });
    expect(await call('resetLeaderboard', {})).toEqual(jasmine.objectContaining({ periods: jasmine.arrayContaining(PERIODS) }));
    const boards = await Promise.all(PERIODS.map((period) => call('listScores', { period })));
    boards.forEach((board) => expect(board.scores).toEqual([]));
  }, SLOW);

  it('leaves the boards ready for new points', async () => {
    await call('resetLeaderboard', {});
    await call('updateUserScore', { user: contract.user._id, points: 3 });
    expect(await scoresOf(contract.user._id)).toEqual([3, 3, 3, 3]);
  }, SLOW);
});
