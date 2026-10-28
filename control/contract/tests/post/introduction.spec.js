// introduction: the pictures and text the app shows behind the leaderboard.
const call = (operation, parameters) => new Promise((resolve, reject) => contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
const reason = (error) => String((error && error.message) || error);
// The reason a call was refused; fails the spec when the call succeeds.
const refusal = (promise) => promise.then(() => fail('expected the call to be refused'), reason);
const unique = (label) => `Post ${label} (${contract.host}) ${Date.now()}`;
const picture = (label, file) => ({ title: unique(label), iconUrl: `https://example.com/${file}.png`, action: 'noAction' });
// The refresh messages to the widget are the plugin's own bookkeeping, which the manifest never mentions: the spy only answers.
const spyOnWidgetMessages = () => beforeEach(() => spyOn(buildfire.messaging, 'sendMessageToWidget'));

contract.describe('getIntroduction', () => {
  spyOnWidgetMessages();

  // The control runs first and may have saved any introduction: the app's run checks only its kind.
  it('shows the pictures and the text', async () => {
    const introduction = await call('getIntroduction', {});
    expect(introduction.carouselItems).toEqual(jasmine.any(Array));
    introduction.carouselItems.forEach((item) => expect(item.iconUrl).toEqual(jasmine.any(String)));
    expect(introduction.description).toEqual(jasmine.any(String));
  });

  it('changes nothing', async () => {
    const before = await call('getIntroduction', {});
    expect(await call('getIntroduction', {})).toEqual(before);
  });

  if (contract.host === 'control') {
    // Only the control panel saves the introduction, so only its run can know what was saved last.
    it('shows what was last saved', async () => {
      const carouselItems = [picture('read picture', 'read')];
      const description = `<p>${unique('read text')}</p>`;
      await call('updateIntroduction', { carouselItems, description });
      expect(await call('getIntroduction', {})).toEqual({ carouselItems, description });
    });
  }
});

// controlBackground only: this block runs in the control frame.
contract.describe('updateIntroduction', () => {
  spyOnWidgetMessages();

  it('saves the pictures and the text, and returns them', async () => {
    const carouselItems = [picture('first picture', 'first'), picture('second picture', 'second')];
    const description = `<p>${unique('text')}</p><ul><li>Rules</li></ul>`;
    expect(await call('updateIntroduction', { carouselItems, description })).toEqual({ carouselItems, description });
    expect(await call('getIntroduction', {})).toEqual({ carouselItems, description });
  });

  it('changes only what it is given', async () => {
    const carouselItems = [picture('kept picture', 'kept')];
    await call('updateIntroduction', { carouselItems, description: '<p>Before</p>' });
    const description = `<p>${unique('new text')}</p>`;
    expect(await call('updateIntroduction', { description })).toEqual({ carouselItems, description });
    const replaced = [picture('new picture', 'new')];
    expect(await call('updateIntroduction', { carouselItems: replaced })).toEqual({ carouselItems: replaced, description });
  });

  it('replaces the pictures, never adding to them', async () => {
    const [first, second] = [picture('replaced picture', 'one'), picture('remaining picture', 'two')];
    await call('updateIntroduction', { carouselItems: [first, second] });
    await call('updateIntroduction', { carouselItems: [second] });
    expect((await call('getIntroduction', {})).carouselItems).toEqual([second]);
  });

  it('removes the pictures with null, and with an empty list', async () => {
    await call('updateIntroduction', { carouselItems: [picture('removed picture', 'removed')] });
    await call('updateIntroduction', { carouselItems: null });
    expect((await call('getIntroduction', {})).carouselItems).toEqual([]);
    await call('updateIntroduction', { carouselItems: [picture('emptied picture', 'emptied')] });
    await call('updateIntroduction', { carouselItems: [] });
    expect((await call('getIntroduction', {})).carouselItems).toEqual([]);
  });

  it('removes the text with null, and with an empty text', async () => {
    await call('updateIntroduction', { description: `<p>${unique('removed text')}</p>` });
    await call('updateIntroduction', { description: null });
    expect((await call('getIntroduction', {})).description).toBe('');
    await call('updateIntroduction', { description: `<p>${unique('emptied text')}</p>` });
    await call('updateIntroduction', { description: '' });
    expect((await call('getIntroduction', {})).description).toBe('');
  });

  describe('refuses, and changes nothing', () => {
    let before;
    beforeEach(async () => {
      before = await call('updateIntroduction', { carouselItems: [picture('standing picture', 'standing')], description: `<p>${unique('standing text')}</p>` });
    });
    afterEach(async () => {
      expect(await call('getIntroduction', {})).toEqual(before);
    });

    it('a call with nothing to change', async () => {
      await expectAsync(call('updateIntroduction', {})).toBeRejected();
    });

    it('pictures that are not a list', async () => {
      expect(await refusal(call('updateIntroduction', { carouselItems: 'https://example.com/bare.png' }))).toContain('carouselItems');
    });

    it('a picture without an image', async () => {
      expect(await refusal(call('updateIntroduction', { carouselItems: [{ title: unique('no image'), action: 'noAction' }] }))).toContain('carouselItems');
    });

    it('a text that is not text', async () => {
      expect(await refusal(call('updateIntroduction', { description: 5 }))).toContain('description');
    });

    it('a bad picture beside new text, saving neither', async () => {
      expect(await refusal(call('updateIntroduction', { carouselItems: [{ title: unique('no image') }], description: '<p>Never saved</p>' }))).toContain('carouselItems');
    });
  });
});
