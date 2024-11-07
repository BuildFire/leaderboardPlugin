const content = {
  initCarousel() {
    this.editor = new buildfire.components.carousel.editor('#contentCarousel');
    this.editor.loadItems(state.carouselItems);

    this.editor.onAddItems = () => {
      state.carouselItems = this.editor.items;
      contentController.updateCarousel();
    };
    this.editor.onDeleteItem = () => {
      state.carouselItems = this.editor.items;
      contentController.updateCarousel();
    };
    this.editor.onItemChange = () => {
      state.carouselItems = this.editor.items;
      contentController.updateCarousel();
    };
    this.editor.onOrderChange = () => {
      state.carouselItems = this.editor.items;
      contentController.updateCarousel();
    };
  },

  initWysiwyg() {
    let timerDelay = null;
    tinymce.init({
      selector: '#wysiwygContent',
      setup: (editor) => {
        editor.on('change keyUp', (e) => {
          if (timerDelay) clearTimeout(timerDelay);
          timerDelay = setTimeout(() => {
            state.wysiwyg = tinymce.activeEditor.getContent();
            contentController.updateWysiwyg();
          }, 500);
        });
        editor.on('init', () => {
          editor.setContent(state.wysiwyg);
        });
      },
    });
  },

  init() {
    Promise.all([
      contentController.getWysiwyg(),
      contentController.getCarousel(),
      authManager.refreshCurrentUser(),
    ]).then(() => {
      this.initCarousel();
      this.initWysiwyg();
    }).catch((err) => {
      console.error(err);
    });
  },
};

window.onload = () => {
  content.init();
};
