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

  updateCarousel() {
    return new Promise((resolve, reject) => {
      Carousels.save(new Carousel({ carouselItems: state.carouselItems }))
        .then(resolve)
        .catch(reject);
    });
  },
};
