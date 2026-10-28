// settings: the plugin's one settings record, kept in the control panel.
const call = (operation, parameters) => new Promise((resolve, reject) => contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
// The refresh message to the widget is the plugin's own bookkeeping: the spy only answers.
const spyOnWidgetMessages = () => beforeEach(() => spyOn(buildfire.messaging, 'sendMessageToWidget'));

contract.describe('getSettings', () => {
  spyOnWidgetMessages();

  it('shows the settings', async () => {
    expect(await call('getSettings', {})).toEqual(jasmine.objectContaining({
      notificationsFrequency: jasmine.any(Array),
      userEarnPoints: jasmine.any(String),
      features: jasmine.any(Array),
      calculateLoyaltyPoints: jasmine.any(Boolean),
    }));
  });
});

contract.describe('updateSettings', () => {
  spyOnWidgetMessages();

  it('turns on loyalty points', async () => {
    expect(await call('updateSettings', { calculateLoyaltyPoints: true })).toEqual(jasmine.objectContaining({ calculateLoyaltyPoints: true }));
  });

  // Ends on the honor system, which the app's run of the score specs relies on.
  it('changes every setting', async () => {
    expect(await call('updateSettings', {
      notifyOnDailyChange: true,
      notifyOnWeeklyChange: false,
      notifyOnMonthlyChange: true,
      notifyOnOverallChange: false,
      userEarnPoints: 'HONOR_SYSTEM',
      questionnaires: [{ title: 'Pre quiz', action: 'linkToApp', instanceId: 'pre-quiz-instance' }],
      calculateLoyaltyPoints: false,
    })).toEqual(jasmine.objectContaining({
      userEarnPoints: 'HONOR_SYSTEM',
      calculateLoyaltyPoints: false,
      notificationsFrequency: jasmine.arrayContaining(['dailyChange', 'monthlyChange']),
      features: jasmine.arrayContaining([jasmine.objectContaining({ instanceId: 'pre-quiz-instance' })]),
    }));
  });
});
