// scores: the leaderboard's four boards (today, this week, this month, overall) and every operation on a person's score.
const call = (operation, parameters) => new Promise((resolve, reject) => contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
// Every score change reads and writes all four boards, one after another: each spec gets the time that takes.
const SLOW = 120000;
const scoresResult = jasmine.objectContaining({
  userId: jasmine.any(String),
  dailyScore: jasmine.any(Number),
  weeklyScore: jasmine.any(Number),
  monthlyScore: jasmine.any(Number),
  overallScore: jasmine.any(Number),
});
const signedIn = () => {
  beforeEach(() => contract.signIn(contract.user));
  afterEach(() => contract.signOut());
};
// Calls nothing here answers: the declared event, and the plugin's own analytics and widget messages.
const spyOnSideEffects = () => {
  beforeEach(() => {
    spyOn(buildfire.services.contract.events, 'send').and.callFake((eventName, data, callback) => callback && callback(null, []));
    spyOn(buildfire.analytics, 'trackAction');
    spyOn(buildfire.messaging, 'sendMessageToWidget');
  });
};

contract.describe('listScores', () => {
  signedIn();
  spyOnSideEffects();

  it('shows the overall leaderboard', async () => {
    await call('updateUserScore', { user: contract.user._id, points: 3 });
    const board = await call('listScores', {});
    expect(board).toEqual(jasmine.objectContaining({ period: 'overall' }));
    expect(board.scores).toEqual(jasmine.arrayContaining([jasmine.objectContaining({ userId: contract.user._id, currentScore: jasmine.any(Number) })]));
  }, SLOW);

  it("shows one person's place on today's leaderboard", async () => {
    await call('updateUserScore', { user: contract.user._id, points: 2 });
    const board = await call('listScores', { period: 'daily', user: contract.user._id });
    expect(board).toEqual(jasmine.objectContaining({ period: 'daily' }));
    expect(board.scores).toEqual(jasmine.arrayContaining([jasmine.objectContaining({ userId: contract.user._id, rank: jasmine.any(Number) })]));
  }, SLOW);
});

contract.describe('updateUserScore', () => {
  signedIn();
  spyOnSideEffects();

  it('adds points to a person, named by their id', async () => {
    expect(await call('updateUserScore', { user: contract.user._id, points: 5 })).toEqual(scoresResult);
  }, SLOW);
});

contract.describe('updateUserScoresAdvanced', () => {
  signedIn();
  spyOnSideEffects();

  it('adds points for several people at once', async () => {
    expect(await call('updateUserScoresAdvanced', { scores: [{ user: contract.user._id, points: 4 }] }))
      .toEqual(jasmine.objectContaining({ succeeded: 1 }));
  }, SLOW);
});

contract.describe('updateUserDailyScore', () => {
  signedIn();
  spyOnSideEffects();

  it("sets a person's score for today", async () => {
    expect(await call('updateUserDailyScore', { user: contract.user._id, newScore: 6 })).toEqual(scoresResult);
  }, SLOW);
});

contract.describe('updateUserDailyScoresAdvanced', () => {
  signedIn();
  spyOnSideEffects();

  it("sets several people's scores for today at once", async () => {
    expect(await call('updateUserDailyScoresAdvanced', { scores: [{ user: contract.user._id, newScore: 8 }] }))
      .toEqual(jasmine.objectContaining({ succeeded: 1 }));
  }, SLOW);
});

contract.describe('resetLeaderboard', () => {
  spyOnSideEffects();

  it('clears the leaderboard', async () => {
    expect(await call('resetLeaderboard', {})).toEqual(jasmine.objectContaining({ periods: jasmine.arrayContaining(['daily', 'weekly', 'monthly', 'overall']) }));
  }, SLOW);
});
