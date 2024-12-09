const contentController = {
  getWysiwyg() {
    return new Promise((resolve, reject) => {
      Wysiwygs.get().then((res) => {
        state.wysiwyg = res.content;
        return resolve(res);
      }).catch(reject);
    });
  },

  updateWysiwyg() {
    return new Promise((resolve, reject) => {
      Wysiwygs.save(new Wysiwyg({ content: state.wysiwyg })).then(resolve).catch(reject);
    });
  },

  getCarousel() {
    return new Promise((resolve, reject) => {
      Carousels.get().then((res) => {
        state.carouselItems = res.carouselItems;
        return resolve(res);
      }).catch(reject);
    });
  },

  getSettings() {
    return new Promise((resolve, reject) => {
      Settings.get().then((settings) => {
        state.settings = new Setting(settings);
        return resolve(settings);
      }).catch((err) => {
        reject(err);
      });
    });
  },

  saveSettings() {
    return new Promise((resolve, reject) => {
      Settings.save(new Setting(state.settings)).then(resolve).catch(reject);
    });
  },

  updateCarousel() {
    return new Promise((resolve, reject) => {
      Carousels.save(new Carousel({ carouselItems: state.carouselItems }))
        .then(resolve)
        .catch(reject);
    });
  },
};
