// settings: the plugin's one settings record, kept by the control panel.
const call = (operation, parameters) => new Promise((resolve, reject) => contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
// A refresh message nothing here answers: the spy stands in for it.
const standIn = () => spyOn(buildfire.messaging, 'sendMessageToWidget');

contract.describe('getSettings', () => {
  beforeEach(standIn);

  it('shows the settings', async () => {
    await call('updateSettings', { calculateLoyaltyPoints: true });
    expect(await call('getSettings', {})).toEqual(jasmine.objectContaining({ calculateLoyaltyPoints: true }));
  });
});

contract.describe('updateSettings', () => {
  beforeEach(standIn);

  it('turns loyalty points off', async () => {
    expect(await call('updateSettings', { calculateLoyaltyPoints: false })).toEqual(jasmine.objectContaining({ calculateLoyaltyPoints: false }));
  });

  it('changes every setting', async () => {
    const features = [{
      title: 'Pre questionnaire',
      action: 'linkToApp',
      instanceId: 'pre-questionnaire-instance',
      iconUrl: 'https://example.com/pre-questionnaire.png',
    }];
    expect(await call('updateSettings', {
      notifyOnDailyChange: true,
      notifyOnWeeklyChange: false,
      notifyOnMonthlyChange: true,
      notifyOnOverallChange: false,
      userEarnPoints: 'HONOR_SYSTEM',
      calculateLoyaltyPoints: false,
      features,
    })).toEqual(jasmine.objectContaining({
      userEarnPoints: 'HONOR_SYSTEM',
      calculateLoyaltyPoints: false,
      notificationsFrequency: jasmine.arrayContaining(['dailyChange', 'monthlyChange']),
    }));
  });
});
