// scores: the leaderboard's boards and the points people have on them, one block per operation.
const call = (operation, parameters) => new Promise((resolve, reject) => contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
// Nothing here answers events, analytics or messaging: spies stand in for them, and Jasmine removes them after each spec.
const standIn = () => {
  spyOn(buildfire.services.contract.events, 'send');
  spyOn(buildfire.analytics, 'trackAction');
  spyOn(buildfire.messaging, 'sendMessageToWidget');
};
const holding = (userId) => jasmine.objectContaining({ scores: jasmine.arrayContaining([jasmine.objectContaining({ userId })]) });

contract.describe('listScores', () => {
  beforeEach(standIn);

  it('shows the overall board', async () => {
    await call('updateUserScore', { userId: contract.user._id, score: 5 });
    expect(await call('listScores', {})).toEqual(holding(contract.user._id));
  });

  it("shows one person's place on today's board", async () => {
    await call('updateUserScore', { userId: contract.user._id, score: 2 });
    expect(await call('listScores', { period: 'daily', userId: contract.user._id })).toEqual(holding(contract.user._id));
  });
});

contract.describe('updateUserScore', () => {
  beforeEach(standIn);

  it("adds points to a person's score", async () => {
    expect(await call('updateUserScore', { userId: contract.user._id, score: 10 }))
      .toEqual(jasmine.objectContaining({ userId: contract.user._id, dailyScore: jasmine.any(Number), overallScore: jasmine.any(Number) }));
  });

  it("sets a person's score for today", async () => {
    expect(await call('updateUserScore', { userId: contract.user._id, score: 12, logType: 'edit' }))
      .toEqual(jasmine.objectContaining({ userId: contract.user._id, dailyScore: 12 }));
  });
});

contract.describe('updateUserScoresAdvanced', () => {
  beforeEach(standIn);

  it('changes several scores at once', async () => {
    expect(await call('updateUserScoresAdvanced', { scores: [{ userId: contract.user._id, score: 3, logType: 'add' }] }))
      .toEqual(jasmine.objectContaining({ succeeded: 1 }));
  });
});

contract.describe('resetLeaderboard', () => {
  beforeEach(standIn);

  it('clears the leaderboard', async () => {
    await call('updateUserScore', { userId: contract.user._id, score: 4 });
    expect(await call('resetLeaderboard', {})).toEqual(jasmine.objectContaining({ cleared: jasmine.any(Array) }));
  });
});
