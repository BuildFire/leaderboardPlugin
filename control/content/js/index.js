const contentPage = {
  syncWithWidget(cmd, data) {
    buildfire.messaging.sendMessageToWidget({ cmd, data });
  },

  initCarousel() {
    this.editor = new buildfire.components.carousel.editor('#contentCarousel');
    this.editor.loadItems(state.carouselItems);

    this.editor.onAddItems = () => {
      state.carouselItems = this.editor.items;
      contentController.updateCarousel().then(() => {
        this.syncWithWidget('carousel', state.carouselItems);
      }).catch((err) => {
        console.error(err);
      });
    };
    this.editor.onDeleteItem = () => {
      state.carouselItems = this.editor.items;
      contentController.updateCarousel().then(() => {
        this.syncWithWidget('carousel', state.carouselItems);
      }).catch((err) => {
        console.error(err);
      });
    };
    this.editor.onItemChange = () => {
      state.carouselItems = this.editor.items;
      contentController.updateCarousel().then(() => {
        this.syncWithWidget('carousel', state.carouselItems);
      }).catch((err) => {
        console.error(err);
      });
    };
    this.editor.onOrderChange = () => {
      state.carouselItems = this.editor.items;
      contentController.updateCarousel().then(() => {
        this.syncWithWidget('carousel', state.carouselItems);
      }).catch((err) => {
        console.error(err);
      });
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
            contentController.updateWysiwyg().then(() => {
              this.syncWithWidget('wysiwyg', state.wysiwyg);
            }).catch((err) => {
              console.error(err);
            });
          }, 500);
        });
        editor.on('init', () => {
          if (state.wysiwyg) {
            editor.setContent(state.wysiwyg);
          }
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
  contentPage.init();
};
