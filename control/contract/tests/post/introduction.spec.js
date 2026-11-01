// introduction: the carousel and the description shown behind the leaderboard.
const call = (operation, parameters) => new Promise((resolve, reject) => contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
const reason = (error) => String((error && error.message) || error);
// The reason a call was refused; fails the spec when the call succeeds.
const refusal = (promise) => promise.then(() => fail('expected the call to be refused'), reason);
const unique = (label) => `Post ${label} (${contract.host}) ${Date.now()}`;
// A refresh message the manifest never mentions: the spy only answers it.
const standIn = () => spyOn(buildfire.messaging, 'sendMessageToWidget');
const slide = (label) => ({ title: unique(label), iconUrl: `https://example.com/${label.replace(/\W+/g, '-')}.png`, action: 'noAction' });
// What the contract's own read shows.
const introduction = () => call('getIntroduction', {});

contract.describe('getIntroduction', () => {
  it('shows the carousel and the description', async () => {
    const shown = await introduction();
    expect(shown).toEqual(jasmine.objectContaining({ carouselItems: jasmine.any(Array), description: jasmine.any(String) }));
    shown.carouselItems.forEach((item) => expect(item).toEqual(jasmine.objectContaining({ iconUrl: jasmine.any(String) })));
  });

  it('changes nothing', async () => {
    const first = await introduction();
    expect(await introduction()).toEqual(first);
  });
});

// controlBackground only: this block runs in the control frame.
contract.describe('updateCarousel', () => {
  beforeEach(standIn);

  it('replaces the carousel, in order, and returns it', async () => {
    await call('updateCarousel', { carouselItems: [slide('replaced')] });
    const carouselItems = [slide('first'), { ...slide('second'), action: 'linkToWeb', url: 'https://example.com' }];
    expect(await call('updateCarousel', { carouselItems })).toEqual({ carouselItems });
    expect((await introduction()).carouselItems).toEqual(carouselItems);
  });

  it('empties the carousel with an empty list, and with null', async () => {
    await call('updateCarousel', { carouselItems: [slide('emptied')] });
    expect(await call('updateCarousel', { carouselItems: [] })).toEqual({ carouselItems: [] });
    expect((await introduction()).carouselItems).toEqual([]);
    await call('updateCarousel', { carouselItems: [slide('nulled')] });
    await call('updateCarousel', { carouselItems: null });
    expect((await introduction()).carouselItems).toEqual([]);
  });

  it('leaves the description alone', async () => {
    const description = `<p>${unique('kept description')}</p>`;
    await call('updateDescription', { description });
    await call('updateCarousel', { carouselItems: [slide('beside')] });
    expect((await introduction()).description).toBe(description);
  });

  describe('refuses, and changes nothing', () => {
    let before;
    beforeEach(async () => {
      await call('updateCarousel', { carouselItems: [slide('kept')] });
      before = await introduction();
    });
    afterEach(async () => {
      expect(await introduction()).toEqual(before);
    });

    it('without images', async () => {
      expect(await refusal(call('updateCarousel', {}))).toContain('carouselItems');
    });

    it('images that are not a list', async () => {
      expect(await refusal(call('updateCarousel', { carouselItems: 'https://example.com/slide.png' }))).toContain('carouselItems');
    });

    it('an image without its picture', async () => {
      const { iconUrl, ...withoutPicture } = slide('no picture');
      expect(await refusal(call('updateCarousel', { carouselItems: [slide('fine'), withoutPicture] }))).toContain('carouselItems');
    });
  });
});

// controlBackground only: this block runs in the control frame.
contract.describe('updateDescription', () => {
  beforeEach(standIn);

  it('saves the description with its formatting, and returns it', async () => {
    const description = `<p>${unique('description')}</p><ul><li>First</li></ul>`;
    expect(await call('updateDescription', { description })).toEqual({ description });
    expect((await introduction()).description).toBe(description);
  });

  it('removes the description with an empty text, and with null', async () => {
    await call('updateDescription', { description: `<p>${unique('emptied')}</p>` });
    expect(await call('updateDescription', { description: '' })).toEqual({ description: '' });
    expect((await introduction()).description).toBe('');
    await call('updateDescription', { description: `<p>${unique('nulled')}</p>` });
    await call('updateDescription', { description: null });
    expect((await introduction()).description).toBe('');
  });

  it('leaves the carousel alone', async () => {
    const carouselItems = [slide('kept carousel')];
    await call('updateCarousel', { carouselItems });
    await call('updateDescription', { description: `<p>${unique('beside')}</p>` });
    expect((await introduction()).carouselItems).toEqual(carouselItems);
  });

  describe('refuses, and changes nothing', () => {
    let before;
    beforeEach(async () => {
      await call('updateDescription', { description: `<p>${unique('kept')}</p>` });
      before = await introduction();
    });
    afterEach(async () => {
      expect(await introduction()).toEqual(before);
    });

    it('without a description', async () => {
      expect(await refusal(call('updateDescription', {}))).toContain('description');
    });

    it('a description that is not text', async () => {
      expect(await refusal(call('updateDescription', { description: 5 }))).toContain('description');
    });
  });
});
