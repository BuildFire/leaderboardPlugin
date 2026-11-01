// scores: the leaderboard's boards and the points people have on them, one block per operation.
const call = (operation, parameters) => new Promise((resolve, reject) => contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
const reason = (error) => String((error && error.message) || error);
// The reason a call was refused; fails the spec when the call succeeds.
const refusal = (promise) => promise.then(() => fail('expected the call to be refused'), reason);
const PERIODS = ['daily', 'weekly', 'monthly', 'overall'];
const missingId = '000000000000000000000000';
// A person the test app does not have: the profile lookup is answered for them by a spy, everyone else for real.
const other = { _id: '6ad6624a418cfa5ac8b30001', displayName: 'Other Player', email: 'other.player@example.com' };
const answerForOther = () => {
  const realGetUserProfile = buildfire.auth.getUserProfile;
  spyOn(buildfire.auth, 'getUserProfile').and.callFake((options, callback) => (options && options.userId === other._id ? callback(null, { ...other }) : realGetUserProfile.call(buildfire.auth, options, callback)));
};
// Nothing here answers events or analytics: spies stand in for them, and Jasmine removes them after each spec.
const standIn = () => {
  spyOn(buildfire.services.contract.events, 'send');
  spyOn(buildfire.analytics, 'trackAction');
};
// A person's score on one board, as the contract's own read shows it: 0 when they are not on it.
const scoreOf = async (period, userId) => {
  const { scores } = await call('listScores', { period, userId });
  return scores.length ? scores[0].score : 0;
};
// A person's score on every board.
const scoresOf = async (userId) => {
  const values = await Promise.all(PERIODS.map((period) => scoreOf(period, userId)));
  return {
    daily: values[0],
    weekly: values[1],
    monthly: values[2],
    overall: values[3],
  };
};

contract.describe('listScores', () => {
  beforeEach(standIn);

  it('shows the overall board when no board is given, best score first, with each place', async () => {
    const me = contract.user._id;
    await call('updateUserScore', { userId: me, score: 4 });
    const overall = await scoreOf('overall', me);
    const { scores } = await call('listScores', {});
    expect(scores).toContain(jasmine.objectContaining({
      rank: jasmine.any(Number),
      userId: me,
      displayName: jasmine.any(String),
      score: overall,
      imageUrl: jasmine.stringMatching(me),
      createdOn: jasmine.anything(),
    }));
    expect(scores.map((entry) => entry.rank)).toEqual(scores.map((entry, index) => index + 1));
    expect(scores.map((entry) => entry.score)).toEqual(scores.map((entry) => entry.score).sort((a, b) => b - a));
  });

  it('shows each board', async () => {
    const me = contract.user._id;
    await call('updateUserScore', { userId: me, score: 2 });
    const boards = await Promise.all(PERIODS.map((period) => call('listScores', { period })));
    boards.forEach((board) => {
      expect(board.scores).toContain(jasmine.objectContaining({ userId: me, score: jasmine.any(Number) }));
    });
  });

  it('only shows the person asked for', async () => {
    const me = contract.user._id;
    await call('updateUserScore', { userId: me, score: 1 });
    const { scores } = await call('listScores', { period: 'daily', userId: me });
    expect(scores.length).toBe(1);
    expect(scores[0]).toEqual(jasmine.objectContaining({ userId: me, rank: jasmine.any(Number) }));
  });

  it('shows nobody for a person not on the board', async () => {
    expect(await call('listScores', { period: 'daily', userId: missingId })).toEqual({ scores: [] });
  });

  it('changes nothing', async () => {
    // The picture's address is rebuilt on every read, so it is left out of the comparison.
    const withoutPictures = ({ scores }) => scores.map(({ imageUrl, ...entry }) => entry);
    const first = await call('listScores', { period: 'weekly' });
    const second = await call('listScores', { period: 'weekly' });
    expect(withoutPictures(second)).toEqual(withoutPictures(first));
  });

  // The control panel's auth lookups don't search the app's users: a person is found by email in the app only.
  if (contract.host === 'widget') {
    it('finds a person by their email', async () => {
      await call('updateUserScore', { userId: contract.user._id, score: 1 });
      const { scores } = await call('listScores', { period: 'daily', userId: contract.user.email });
      expect(scores).toEqual([jasmine.objectContaining({ userId: contract.user._id })]);
    });

    it('refuses an email nobody has, naming it', async () => {
      const email = `post.nobody.${Date.now()}@example.com`;
      expect(await refusal(call('listScores', { userId: email }))).toContain(email);
    });
  }

  describe('refuses', () => {
    it('a board it does not offer', async () => {
      expect(await refusal(call('listScores', { period: 'yearly' }))).toContain('period');
    });

    it('a person that is not text', async () => {
      expect(await refusal(call('listScores', { userId: 5 }))).toContain('userId');
    });
  });
});

contract.describe('updateUserScore', () => {
  beforeEach(standIn);

  it('adds the points to every board, and returns the new scores', async () => {
    const me = contract.user._id;
    const before = await scoresOf(me);
    expect(await call('updateUserScore', { userId: me, score: 7 })).toEqual(jasmine.objectContaining({
      userId: me,
      displayName: jasmine.any(String),
      dailyScore: before.daily + 7,
      weeklyScore: before.weekly + 7,
      monthlyScore: before.monthly + 7,
      overallScore: before.overall + 7,
    }));
    expect(await scoresOf(me)).toEqual({
      daily: before.daily + 7,
      weekly: before.weekly + 7,
      monthly: before.monthly + 7,
      overall: before.overall + 7,
    });
  }, 120000);

  it('adds the points when asked to add', async () => {
    const me = contract.user._id;
    const before = await scoresOf(me);
    await call('updateUserScore', { userId: me, score: 3, logType: 'add' });
    expect(await scoresOf(me)).toEqual({
      daily: before.daily + 3,
      weekly: before.weekly + 3,
      monthly: before.monthly + 3,
      overall: before.overall + 3,
    });
  }, 120000);

  it("makes them today's score when editing, and moves the other boards by the same difference", async () => {
    const me = contract.user._id;
    await call('updateUserScore', { userId: me, score: 5 });
    const before = await scoresOf(me);
    const result = await call('updateUserScore', { userId: me, score: 40, logType: 'edit' });
    const expected = {
      daily: 40,
      weekly: before.weekly - before.daily + 40,
      monthly: before.monthly - before.daily + 40,
      overall: before.overall - before.daily + 40,
    };
    expect(result).toEqual(jasmine.objectContaining({
      userId: me,
      dailyScore: expected.daily,
      weeklyScore: expected.weekly,
      monthlyScore: expected.monthly,
      overallScore: expected.overall,
    }));
    expect(await scoresOf(me)).toEqual(expected);
  }, 120000);

  it('announces the change', async () => {
    const me = contract.user._id;
    const before = await scoresOf(me);
    buildfire.services.contract.events.send.calls.reset();
    await call('updateUserScore', { userId: me, score: 6 });
    expect(buildfire.services.contract.events.send.calls.count()).toBe(1);
    expect(buildfire.services.contract.events.send.calls.argsFor(0).slice(0, 2)).toEqual(['scoreUpdated', jasmine.objectContaining({
      user: jasmine.objectContaining({ userId: me }),
      change: 'Added',
      points: 6,
      dailyScore: before.daily + 6,
      overallScore: before.overall + 6,
    })]);
  }, 120000);

  it('announces an edit as edited', async () => {
    buildfire.services.contract.events.send.calls.reset();
    await call('updateUserScore', { userId: contract.user._id, score: 9, logType: 'edit' });
    expect(buildfire.services.contract.events.send.calls.argsFor(0).slice(0, 2)).toEqual(['scoreUpdated', jasmine.objectContaining({ change: 'Edited', points: 9, dailyScore: 9 })]);
  });

  it('puts a person on the board with the name their profile has', async () => {
    answerForOther();
    const before = await scoreOf('daily', other._id);
    await call('updateUserScore', { userId: other._id, score: 2 });
    const { scores } = await call('listScores', { period: 'daily', userId: other._id });
    expect(scores).toEqual([jasmine.objectContaining({ userId: other._id, displayName: 'Other Player', score: before + 2 })]);
  });

  // The control panel's auth lookups don't search the app's users: a person is found by email in the app only.
  if (contract.host === 'widget') {
    it('finds the person by their email', async () => {
      const before = await scoreOf('daily', contract.user._id);
      expect(await call('updateUserScore', { userId: contract.user.email, score: 2 })).toEqual(jasmine.objectContaining({ userId: contract.user._id, dailyScore: before + 2 }));
    });
  }

  describe('refuses, changes nothing and announces nothing', () => {
    let overallBefore;
    beforeEach(async () => {
      overallBefore = await scoreOf('overall', contract.user._id);
      buildfire.services.contract.events.send.calls.reset();
    });
    afterEach(async () => {
      expect(await scoreOf('overall', contract.user._id)).toBe(overallBefore);
      expect(buildfire.services.contract.events.send).not.toHaveBeenCalled();
    });

    it('without a person', async () => {
      expect(await refusal(call('updateUserScore', { score: 5 }))).toContain('userId');
    });

    it('with an empty person', async () => {
      expect(await refusal(call('updateUserScore', { userId: null, score: 5 }))).toContain('userId');
      expect(await refusal(call('updateUserScore', { userId: '', score: 5 }))).toContain('userId');
    });

    it('a person nobody is, naming them', async () => {
      expect(await refusal(call('updateUserScore', { userId: missingId, score: 5 }))).toContain(missingId);
    });

    it('without points', async () => {
      expect(await refusal(call('updateUserScore', { userId: contract.user._id }))).toContain('score');
      expect(await refusal(call('updateUserScore', { userId: contract.user._id, score: null }))).toContain('score');
    });

    it('points that are not a number', async () => {
      expect(await refusal(call('updateUserScore', { userId: contract.user._id, score: 'ten' }))).toContain('score');
    });

    it('a change it does not offer', async () => {
      expect(await refusal(call('updateUserScore', { userId: contract.user._id, score: 5, logType: 'replace' }))).toContain('logType');
    });
  });
});

contract.describe('updateUserScoresAdvanced', () => {
  beforeEach(() => {
    standIn();
    answerForOther();
  });

  it('changes every score, and reports each', async () => {
    const me = contract.user._id;
    const mine = await scoreOf('daily', me);
    const theirs = await scoreOf('daily', other._id);
    buildfire.services.contract.events.send.calls.reset();
    const result = await call('updateUserScoresAdvanced', { scores: [{ userId: me, score: 4 }, { userId: other._id, score: 6, logType: 'add' }] });
    expect(result).toEqual(jasmine.objectContaining({
      scores: [jasmine.objectContaining({ index: 0, id: me }), jasmine.objectContaining({ index: 1, id: other._id })],
      succeeded: 2,
      failed: 0,
    }));
    expect(await scoreOf('daily', me)).toBe(mine + 4);
    expect(await scoreOf('daily', other._id)).toBe(theirs + 6);
    expect(buildfire.services.contract.events.send.calls.allArgs().map((args) => args[0])).toEqual(['scoreUpdated', 'scoreUpdated']);
  }, 120000);

  it("sets today's score when an entry edits it", async () => {
    await call('updateUserScoresAdvanced', { scores: [{ userId: other._id, score: 15, logType: 'edit' }] });
    expect(await scoreOf('daily', other._id)).toBe(15);
  });

  describe('refuses the whole list, and changes none of it', () => {
    let mine;
    beforeEach(async () => {
      mine = await scoreOf('daily', contract.user._id);
    });
    afterEach(async () => {
      expect(await scoreOf('daily', contract.user._id)).toBe(mine);
    });

    it('when one entry is invalid', async () => {
      const scores = [{ userId: contract.user._id, score: 5 }, { userId: other._id, score: 'six' }];
      expect(await refusal(call('updateUserScoresAdvanced', { scores }))).toContain('score');
    });

    it('when one person is nobody', async () => {
      const scores = [{ userId: contract.user._id, score: 5 }, { userId: missingId, score: 6 }];
      expect(await refusal(call('updateUserScoresAdvanced', { scores }))).toContain(missingId);
    });

    it('when the same person is listed twice', async () => {
      const scores = [{ userId: contract.user._id, score: 5 }, { userId: contract.user._id, score: 6 }];
      await expectAsync(call('updateUserScoresAdvanced', { scores })).toBeRejected();
    });

    it('when it is empty', async () => {
      await expectAsync(call('updateUserScoresAdvanced', { scores: [] })).toBeRejected();
    });

    it('when it holds more than 50 entries', async () => {
      const scores = Array.from({ length: 51 }, () => ({ userId: contract.user._id, score: 1 }));
      await expectAsync(call('updateUserScoresAdvanced', { scores })).toBeRejected();
    });

    it('when it is missing', async () => {
      expect(await refusal(call('updateUserScoresAdvanced', {}))).toContain('scores');
    });
  });
});

// controlBackground only: this block runs in the control frame.
contract.describe('resetLeaderboard', () => {
  beforeEach(() => {
    standIn();
    // A refresh message the manifest never mentions: the spy only answers it.
    spyOn(buildfire.messaging, 'sendMessageToWidget');
  });

  it('clears every board', async () => {
    await call('updateUserScore', { userId: contract.user._id, score: 8 });
    expect(await call('resetLeaderboard', {})).toEqual(jasmine.objectContaining({ cleared: jasmine.arrayContaining(PERIODS) }));
    const boards = await Promise.all(PERIODS.map((period) => call('listScores', { period })));
    expect(boards).toEqual(PERIODS.map(() => ({ scores: [] })));
  });

  it('starts every board afresh for the next points', async () => {
    await call('resetLeaderboard', {});
    await call('updateUserScore', { userId: contract.user._id, score: 3 });
    expect(await scoresOf(contract.user._id)).toEqual({
      daily: 3,
      weekly: 3,
      monthly: 3,
      overall: 3,
    });
  });
});
