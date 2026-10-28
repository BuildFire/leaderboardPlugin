// settings: the plugin's one settings record, kept in the control panel.
const call = (operation, parameters) => new Promise((resolve, reject) => contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
const reason = (error) => String((error && error.message) || error);
// The reason a call was refused; fails the spec when the call succeeds.
const refusal = (promise) => promise.then(() => fail('expected the call to be refused'), reason);
const unique = (label) => `Post ${label} (${contract.host}) ${Date.now()}`;
const EARN_POINTS = ['HONOR_SYSTEM', 'SCORE_FROM_FREE_TEXT_QUESTIONNAIRE'];
const FREQUENCIES = ['dailyChange', 'weeklyChange', 'monthlyChange', 'allTimeChange'];
const quiz = (label) => ({ title: unique(label), action: 'linkToApp', instanceId: unique(`${label} instance`) });
// The refresh message to the widget is the plugin's own bookkeeping, which the manifest never mentions: the spy only answers.
const spyOnWidgetMessages = () => beforeEach(() => spyOn(buildfire.messaging, 'sendMessageToWidget'));

// controlBackground only: this block runs in the control frame.
contract.describe('getSettings', () => {
  spyOnWidgetMessages();

  it('shows every setting, each of its kind', async () => {
    const settings = await call('getSettings', {});
    expect(settings.notificationsFrequency).toEqual(jasmine.any(Array));
    settings.notificationsFrequency.forEach((key) => expect(FREQUENCIES).toContain(key));
    expect(EARN_POINTS).toContain(settings.userEarnPoints);
    expect(settings.features).toEqual(jasmine.any(Array));
    expect(settings.calculateLoyaltyPoints).toEqual(jasmine.any(Boolean));
  });

  it('shows what was last saved', async () => {
    const questionnaires = [quiz('read quiz')];
    await call('updateSettings', { calculateLoyaltyPoints: true, notifyOnMonthlyChange: true, questionnaires });
    expect(await call('getSettings', {})).toEqual(jasmine.objectContaining({
      calculateLoyaltyPoints: true,
      notificationsFrequency: jasmine.arrayContaining(['monthlyChange']),
      features: [jasmine.objectContaining({ ...questionnaires[0], order: 0 })],
    }));
  });

  it('changes nothing', async () => {
    const before = await call('getSettings', {});
    await call('getSettings', {});
    expect(await call('getSettings', {})).toEqual(before);
  });
});

// controlBackground only: this block runs in the control frame.
contract.describe('updateSettings', () => {
  spyOnWidgetMessages();
  // The app's run comes after this one and adds points by hand, which only the honor system allows: every spec leaves it on.
  afterEach(() => call('updateSettings', { userEarnPoints: 'HONOR_SYSTEM' }));

  it('turns each rank change notification on and off', async () => {
    const saved = await call('updateSettings', {
      notifyOnDailyChange: true, notifyOnWeeklyChange: false, notifyOnMonthlyChange: true, notifyOnOverallChange: false,
    });
    expect(saved.notificationsFrequency).toEqual(jasmine.arrayContaining(['dailyChange', 'monthlyChange']));
    expect(saved.notificationsFrequency).not.toContain('weeklyChange');
    expect(saved.notificationsFrequency).not.toContain('allTimeChange');

    await call('updateSettings', { notifyOnDailyChange: false, notifyOnOverallChange: true });
    const { notificationsFrequency } = await call('getSettings', {});
    expect(notificationsFrequency).toEqual(jasmine.arrayContaining(['monthlyChange', 'allTimeChange']));
    expect(notificationsFrequency).not.toContain('dailyChange');
    expect(notificationsFrequency).not.toContain('weeklyChange');
  });

  it('turns a notification on only once', async () => {
    await call('updateSettings', { notifyOnWeeklyChange: true });
    const saved = await call('updateSettings', { notifyOnWeeklyChange: true });
    expect(saved.notificationsFrequency.filter((key) => key === 'weeklyChange').length).toBe(1);
  });

  it('switches to points from questionnaires, which stops scores being changed by hand', async () => {
    expect((await call('updateSettings', { userEarnPoints: 'SCORE_FROM_FREE_TEXT_QUESTIONNAIRE' })).userEarnPoints).toBe('SCORE_FROM_FREE_TEXT_QUESTIONNAIRE');
    expect((await call('getSettings', {})).userEarnPoints).toBe('SCORE_FROM_FREE_TEXT_QUESTIONNAIRE');

    await contract.signIn(contract.user);
    spyOn(buildfire.services.contract.events, 'send');
    spyOn(buildfire.analytics, 'trackAction');
    try {
      expect(await refusal(call('updateUserScore', { user: contract.user._id, points: 5 }))).toContain('questionnaires');
      expect(await refusal(call('updateUserDailyScore', { user: contract.user._id, newScore: 5 }))).toContain('questionnaires');
      expect(buildfire.services.contract.events.send).not.toHaveBeenCalled();
    } finally {
      contract.signOut();
    }
  }, 120000);

  it('switches back to the honor system', async () => {
    await call('updateSettings', { userEarnPoints: 'SCORE_FROM_FREE_TEXT_QUESTIONNAIRE' });
    expect((await call('updateSettings', { userEarnPoints: 'HONOR_SYSTEM' })).userEarnPoints).toBe('HONOR_SYSTEM');
    expect((await call('getSettings', {})).userEarnPoints).toBe('HONOR_SYSTEM');
  });

  it('replaces the questionnaires, in order, and empties them with null and with an empty list', async () => {
    const [first, second] = [quiz('first quiz'), quiz('second quiz')];
    expect((await call('updateSettings', { questionnaires: [first, second] })).features).toEqual([
      jasmine.objectContaining({ ...first, order: 0 }), jasmine.objectContaining({ ...second, order: 1 }),
    ]);
    await call('updateSettings', { questionnaires: [second] });
    expect((await call('getSettings', {})).features).toEqual([jasmine.objectContaining({ ...second, order: 0 })]);
    await call('updateSettings', { questionnaires: null });
    expect((await call('getSettings', {})).features).toEqual([]);
    await call('updateSettings', { questionnaires: [first] });
    await call('updateSettings', { questionnaires: [] });
    expect((await call('getSettings', {})).features).toEqual([]);
  });

  it('keeps every setting it is not given', async () => {
    const questionnaires = [quiz('kept quiz')];
    await call('updateSettings', {
      calculateLoyaltyPoints: true, notifyOnDailyChange: true, questionnaires, userEarnPoints: 'HONOR_SYSTEM',
    });
    await call('updateSettings', { notifyOnWeeklyChange: true });
    expect(await call('getSettings', {})).toEqual(jasmine.objectContaining({
      calculateLoyaltyPoints: true,
      userEarnPoints: 'HONOR_SYSTEM',
      notificationsFrequency: jasmine.arrayContaining(['dailyChange', 'weeklyChange']),
      features: [jasmine.objectContaining({ instanceId: questionnaires[0].instanceId })],
    }));
    expect((await call('updateSettings', { calculateLoyaltyPoints: false })).calculateLoyaltyPoints).toBe(false);
  });

  describe('refuses, and changes nothing', () => {
    let before;
    beforeEach(async () => {
      before = await call('getSettings', {});
    });
    afterEach(async () => {
      expect(await call('getSettings', {})).toEqual(before);
    });

    it('a call with no setting in it', async () => {
      await expectAsync(call('updateSettings', {})).toBeRejected();
    });

    it('a notification choice that is not true or false', async () => {
      expect(await refusal(call('updateSettings', { notifyOnDailyChange: 'yes' }))).toContain('notifyOnDailyChange');
    });

    it('a way of earning points it does not offer', async () => {
      expect(await refusal(call('updateSettings', { userEarnPoints: 'CHECK_IN' }))).toContain('userEarnPoints');
    });

    it('questionnaires that are not a list', async () => {
      expect(await refusal(call('updateSettings', { questionnaires: 'weekly quiz' }))).toContain('questionnaires');
    });

    it('a questionnaire that links to no feature', async () => {
      expect(await refusal(call('updateSettings', { questionnaires: [{ title: unique('no link'), action: 'linkToWeb', url: 'https://example.com' }] }))).toContain('questionnaires');
    });

    it('a loyalty choice that is not true or false', async () => {
      expect(await refusal(call('updateSettings', { calculateLoyaltyPoints: 1 }))).toContain('calculateLoyaltyPoints');
    });
  });
});
