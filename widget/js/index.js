/* eslint-disable prefer-destructuring */
/* eslint-disable max-len */
const widget = {

  handleCPSync() {
    buildfire.messaging.onReceivedMessage = (message) => {
      switch (message.cmd) {
        case 'carousel':
          state.carousel = message.data;
          homePage.appendCarouselItems();
          break;
        case 'wysiwyg':
          state.wysiwyg.content = message.data;
          homePage.printWYSIWYGContent();
          break;
        case 'settings':
          state.settings = message.data;
          scoreSwipeableDrawer.renderScoreList(state.currentListScores);
          break;
        case 'reset':
          window.location.reload();
          break;
        default:
          break;
      }
    };
  },

  init() {
    buildfire.appearance.titlebar.show();

    const promises = [widgetController.getScores(enums.Keys.overall), widgetController.init(), initLanguageStrings()];
    Promise.all(promises).then(([scores]) => {
      homePage.init();

      scoreSwipeableDrawer.init();
      this.handleCPSync();

      if (authManager.currentUser) {
        widgetController.checkForNewPoints();
      }

      if (scores && scores.length > 0) {
        state.overallScores = scores;

        scoreSwipeableDrawer.toggleDrawer();
        scoreSwipeableDrawer.renderScoreList(scores);
      }
    }).catch((err) => {
      console.error(err);
    });
  },
};

window.onload = () => {
  authManager.refreshCurrentUser().then(() => {
    widget.init();
  });
};
