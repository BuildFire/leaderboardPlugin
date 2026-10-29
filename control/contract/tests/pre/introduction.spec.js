// introduction: the carousel and the description shown behind the leaderboard.
const call = (operation, parameters) => new Promise((resolve, reject) => contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
// A refresh message nothing here answers: the spy stands in for it.
const standIn = () => spyOn(buildfire.messaging, 'sendMessageToWidget');

contract.describe('getIntroduction', () => {
  it('shows the introduction', async () => {
    expect(await call('getIntroduction', {})).toEqual(jasmine.objectContaining({ carouselItems: jasmine.any(Array), description: jasmine.any(String) }));
  });
});

contract.describe('updateCarousel', () => {
  beforeEach(standIn);

  it('replaces the carousel', async () => {
    const carouselItems = [
      { title: 'Pre slide one', iconUrl: 'https://example.com/pre-slide-one.png', action: 'noAction' },
      { title: 'Pre slide two', iconUrl: 'https://example.com/pre-slide-two.png', action: 'noAction' },
    ];
    expect(await call('updateCarousel', { carouselItems })).toEqual(jasmine.objectContaining({ carouselItems: jasmine.any(Array) }));
    expect(await call('getIntroduction', {})).toEqual(jasmine.objectContaining({ carouselItems: [jasmine.objectContaining({ title: 'Pre slide one' }), jasmine.objectContaining({ title: 'Pre slide two' })] }));
  });
});

contract.describe('updateDescription', () => {
  beforeEach(standIn);

  it('replaces the description', async () => {
    const description = '<p>Pre description</p>';
    expect(await call('updateDescription', { description })).toEqual(jasmine.objectContaining({ description }));
    expect(await call('getIntroduction', {})).toEqual(jasmine.objectContaining({ description }));
  });
});
