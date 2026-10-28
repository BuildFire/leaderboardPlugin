// settings: the plugin's one settings record, kept by the control panel.
const call = (operation, parameters) => new Promise((resolve, reject) => contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
const reason = (error) => String((error && error.message) || error);
// The reason a call was refused; fails the spec when the call succeeds.
const refusal = (promise) => promise.then(() => fail('expected the call to be refused'), reason);
const unique = (label) => `Post ${label} (${contract.host}) ${Date.now()}`;
const EARN_POINTS = ['HONOR_SYSTEM', 'SCORE_FROM_FREE_TEXT_QUESTIONNAIRE'];
const FREQUENCIES = ['dailyChange', 'weeklyChange', 'monthlyChange', 'allTimeChange'];
// A refresh message the manifest never mentions: the spy only answers it.
const standIn = () => spyOn(buildfire.messaging, 'sendMessageToWidget');
const questionnaire = (label) => ({
  title: unique(label),
  action: 'linkToApp',
  instanceId: unique(`${label} instance`).replace(/\W+/g, '-'),
  iconUrl: 'https://example.com/questionnaire.png',
});
// The app's run reads whatever these specs leave: they put back the plugin's defaults, so people can enter their own points.
const restoreDefaults = () => call('updateSettings', {
  notifyOnDailyChange: false,
  notifyOnWeeklyChange: false,
  notifyOnMonthlyChange: false,
  notifyOnOverallChange: false,
  userEarnPoints: 'HONOR_SYSTEM',
  calculateLoyaltyPoints: false,
  features: [],
});

// controlBackground only: this block runs in the control frame.
contract.describe('getSettings', () => {
  beforeEach(standIn);

  it('shows every setting, each of its kind', async () => {
    const settings = await call('getSettings', {});
    expect(settings).toEqual(jasmine.objectContaining({
      notificationsFrequency: jasmine.any(Array),
      userEarnPoints: jasmine.any(String),
      calculateLoyaltyPoints: jasmine.any(Boolean),
      features: jasmine.any(Array),
    }));
    expect(EARN_POINTS).toContain(settings.userEarnPoints);
    settings.notificationsFrequency.forEach((frequency) => expect(FREQUENCIES).toContain(frequency));
  });

  it('shows what was saved last', async () => {
    const feature = questionnaire('shown');
    await call('updateSettings', { calculateLoyaltyPoints: true, notifyOnMonthlyChange: true, features: [feature] });
    expect(await call('getSettings', {})).toEqual(jasmine.objectContaining({
      calculateLoyaltyPoints: true,
      notificationsFrequency: jasmine.arrayContaining(['monthlyChange']),
      features: [jasmine.objectContaining({ ...feature, order: 0 })],
    }));
    await restoreDefaults();
  });

  it('changes nothing', async () => {
    const first = await call('getSettings', {});
    expect(await call('getSettings', {})).toEqual(first);
  });
});

// controlBackground only: this block runs in the control frame.
contract.describe('updateSettings', () => {
  beforeEach(standIn);
  afterAll(restoreDefaults);

  it('changes only the settings it is given, and returns them all', async () => {
    await call('updateSettings', { notifyOnDailyChange: true, notifyOnWeeklyChange: false, userEarnPoints: 'SCORE_FROM_FREE_TEXT_QUESTIONNAIRE' });
    const saved = await call('updateSettings', { calculateLoyaltyPoints: true });
    expect(saved).toEqual(jasmine.objectContaining({
      calculateLoyaltyPoints: true,
      userEarnPoints: 'SCORE_FROM_FREE_TEXT_QUESTIONNAIRE',
      notificationsFrequency: jasmine.arrayContaining(['dailyChange']),
      features: jasmine.any(Array),
    }));
    expect(saved.notificationsFrequency).not.toContain('weeklyChange');
    expect(await call('getSettings', {})).toEqual(saved);
  });

  it('turns each notification on and off', async () => {
    const on = await call('updateSettings', {
      notifyOnDailyChange: true,
      notifyOnWeeklyChange: true,
      notifyOnMonthlyChange: true,
      notifyOnOverallChange: true,
    });
    expect([...on.notificationsFrequency].sort()).toEqual([...FREQUENCIES].sort());
    const off = await call('updateSettings', { notifyOnWeeklyChange: false, notifyOnOverallChange: false });
    expect([...off.notificationsFrequency].sort()).toEqual(['dailyChange', 'monthlyChange']);
    expect((await call('getSettings', {})).notificationsFrequency.sort()).toEqual(['dailyChange', 'monthlyChange']);
  });

  it('switches how people earn points', async () => {
    await call('updateSettings', { userEarnPoints: 'SCORE_FROM_FREE_TEXT_QUESTIONNAIRE' });
    expect((await call('getSettings', {})).userEarnPoints).toBe('SCORE_FROM_FREE_TEXT_QUESTIONNAIRE');
    await call('updateSettings', { userEarnPoints: 'HONOR_SYSTEM' });
    expect((await call('getSettings', {})).userEarnPoints).toBe('HONOR_SYSTEM');
  });

  it('replaces the questionnaires, in order, and keeps them when left out', async () => {
    const first = questionnaire('first');
    const second = questionnaire('second');
    await call('updateSettings', { features: [questionnaire('replaced')] });
    await call('updateSettings', { features: [first, second] });
    await call('updateSettings', { calculateLoyaltyPoints: false });
    expect((await call('getSettings', {})).features).toEqual([
      jasmine.objectContaining({ ...first, order: 0 }),
      jasmine.objectContaining({ ...second, order: 1 }),
    ]);
  });

  it('removes every questionnaire with an empty list, and with null', async () => {
    await call('updateSettings', { features: [questionnaire('emptied')] });
    await call('updateSettings', { features: [] });
    expect((await call('getSettings', {})).features).toEqual([]);
    await call('updateSettings', { features: [questionnaire('nulled')] });
    await call('updateSettings', { features: null });
    expect((await call('getSettings', {})).features).toEqual([]);
  });

  describe('refuses, and changes nothing', () => {
    let before;
    beforeEach(async () => {
      before = await call('getSettings', {});
    });
    afterEach(async () => {
      expect(await call('getSettings', {})).toEqual(before);
    });

    it('a way of earning points it does not offer', async () => {
      expect(await refusal(call('updateSettings', { userEarnPoints: 'LOYALTY' }))).toContain('userEarnPoints');
    });

    it('a notification choice that is not true or false', async () => {
      expect(await refusal(call('updateSettings', { notifyOnDailyChange: 'yes' }))).toContain('notifyOnDailyChange');
    });

    it('a loyalty choice that is not true or false', async () => {
      expect(await refusal(call('updateSettings', { calculateLoyaltyPoints: 'yes' }))).toContain('calculateLoyaltyPoints');
    });

    it('questionnaires that are not a list', async () => {
      expect(await refusal(call('updateSettings', { features: 'questionnaire' }))).toContain('features');
    });

    it('a questionnaire that opens nothing', async () => {
      const { instanceId, ...withoutInstance } = questionnaire('nowhere');
      expect(await refusal(call('updateSettings', { features: [withoutInstance] }))).toContain('features');
    });

    it('a call with no setting in it', async () => {
      await expectAsync(call('updateSettings', {})).toBeRejected();
    });
  });
});
