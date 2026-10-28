// introduction: the pictures and text the app shows behind the leaderboard.
const call = (operation, parameters) => new Promise((resolve, reject) => contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
// The refresh messages to the widget are the plugin's own bookkeeping: the spy only answers.
const spyOnWidgetMessages = () => beforeEach(() => spyOn(buildfire.messaging, 'sendMessageToWidget'));

contract.describe('getIntroduction', () => {
  spyOnWidgetMessages();

  it('shows the introduction', async () => {
    expect(await call('getIntroduction', {})).toEqual(jasmine.objectContaining({
      carouselItems: jasmine.any(Array),
      description: jasmine.any(String),
    }));
  });
});

contract.describe('updateIntroduction', () => {
  spyOnWidgetMessages();

  it('changes the text', async () => {
    const description = '<p>Pre introduction text</p>';
    expect(await call('updateIntroduction', { description })).toEqual(jasmine.objectContaining({ description }));
  });

  it('changes the pictures and the text', async () => {
    const carouselItems = [{ title: 'Pre picture', iconUrl: 'https://example.com/pre-picture.png', action: 'noAction' }];
    const description = '<p>Pre introduction with pictures</p>';
    expect(await call('updateIntroduction', { carouselItems, description }))
      .toEqual(jasmine.objectContaining({ carouselItems: [jasmine.objectContaining(carouselItems[0])], description }));
  });
});
