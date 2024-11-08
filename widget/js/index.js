/* eslint-disable prefer-destructuring */
/* eslint-disable max-len */
const widget = {

  handleCPSync() {
    buildfire.messaging.onReceivedMessage = (message) => {
      switch (message.cmd) {
        case 'carousel':
          state.carousel = message.data;
          this.appendCarouselItems();
          break;
        case 'wysiwyg':
          state.wysiwyg.content = message.data;
          this.printWYSIWYGContent();
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

  checkForNewPoints() {
    const pointsPromises = [];
    if (state.settings.calculateLoyaltyPoints) {
      pointsPromises.push(widgetController.getNewLoyaltyPoints());
    }

    if (state.settings.userEarnPoints === enums.EARN_POINTS.FROM_FTQ) {
      pointsPromises.push(widgetController.getNewFTQPoints());
    }

    if (pointsPromises.length) {
      Promise.all(pointsPromises).then((results) => {
        let loyaltyPoints;
        let ftqPoints;
        let additionalPoints = 0;

        if (state.settings.calculateLoyaltyPoints) {
          loyaltyPoints = results[0];
          if (state.settings.userEarnPoints === enums.EARN_POINTS.FROM_FTQ) {
            ftqPoints = results[1];
          }
        } else {
          ftqPoints = results[0];
        }

        // Loyalty points are being calculated like below
        // user loyalty record is a single record and all not calculated points will be stored in this record
        if (loyaltyPoints && loyaltyPoints[0] && loyaltyPoints[0].data && loyaltyPoints[0].data.newPoints) {
          additionalPoints += loyaltyPoints[0].data.newPoints;
        }

        if (ftqPoints && ftqPoints.length) {
          ftqPoints.forEach((submission) => {
            if (submission && submission.length) {
              submission[0].data.answers.forEach((answer) => {
                if (answer && answer.score) {
                  additionalPoints += answer.score;
                }
              });
            }
          });
        }

        if (additionalPoints > 0) {
          const options = { newScore: additionalPoints, logType: 'add' };
          widgetController.addEditUserScore(options).then(() => {
            Promise.all([
              widgetController.resetLoyaltyPoint(),
              widgetController.resetFTQPoints(),
            ]).then(() => {
              scoreSwipeableDrawer.toggleDrawer();
              scoreSwipeableDrawer.switchTab(state.activeTab);
            }).catch((err) => {
              console.error(err);
            });
          }).catch((err) => {
            console.error(err);
          });
        }
      });
    }
  },

  printWYSIWYGContent() {
    document.getElementById('my_container_div').innerHTML = state.wysiwyg.content || '';
  },

  appendCarouselItems() {
    if (state.carousel && state.carousel.length) {
      this.view.loadItems(state.carousel);
    }
  },

  openScoreDialog(dialogType = 'add') {
    const addEditDialogTitle = document.getElementById('addEditDialogTitle');
    const addEditDialogSubtitle = document.getElementById('addEditDialogSubtitle');
    const addEditScoreInput = document.getElementById('addEditScoreInput');
    const addScoreLabel = document.getElementById('addScoreLabel');
    const addScoreErrorMessage = document.getElementById('addScoreErrorMessage');
    const closeScoreDialog = document.getElementById('closeScoreDialog');
    const submitScoreBtn = document.getElementById('submitScoreBtn');

    const inputHolder = document.getElementById('addInputHolder');
    const scoreInput = new mdc.textField.MDCTextField(inputHolder);

    closeScoreDialog.innerHTML = getLanguage('score.dialogCancel');
    submitScoreBtn.innerHTML = getLanguage('score.dialogSave');
    addScoreLabel.innerHTML = getLanguage('score.yourScore');
    addScoreErrorMessage.innerHTML = getLanguage('score.requiredMessage');

    addScoreErrorMessage.classList.add('hidden');

    if (dialogType === 'add') {
      addEditDialogTitle.innerHTML = getLanguage('score.add');
      addEditDialogSubtitle.innerHTML = getLanguage('score.addSubtitle');
      submitScoreBtn.onclick = () => {
        if (!addEditScoreInput.value) {
          addScoreErrorMessage.classList.remove('hidden');
        } else {
          this.addEditScoreDialog.close();

          const options = { newScore: parseInt(addEditScoreInput.value), logType: 'add' };
          widgetController.addEditUserScore(options).then(() => {
            scoreSwipeableDrawer.toggleDrawer();
            scoreSwipeableDrawer.switchTab(state.activeTab);

            AnalyticsManager.trackAction('score-logged');
          }).catch((err) => {
            console.error(err);
          });
        }
      };
    } else if (dialogType === 'edit') {
      addEditDialogTitle.innerHTML = getLanguage('score.edit');
      addEditDialogSubtitle.innerHTML = getLanguage('score.editSubtitle');
      submitScoreBtn.onclick = () => {
        if (!addEditScoreInput.value) {
          addScoreErrorMessage.classList.remove('hidden');
        } else {
          this.addEditScoreDialog.close();

          const options = { newScore: parseInt(addEditScoreInput.value), logType: 'edit' };
          widgetController.addEditUserScore(options).then(() => {
            scoreSwipeableDrawer.toggleDrawer();
            scoreSwipeableDrawer.switchTab(state.activeTab);
          }).catch((err) => {
            console.error(err);
          });
        }
      };
    }

    closeScoreDialog.onclick = () => {
      this.addEditScoreDialog.close();
    };

    addEditScoreInput.value = '';
    this.addEditScoreDialog.open();
  },

  // Toggle the view where the user adds the score
  showAddScoreView() {
    if (authManager.currentUser) {
      if (state.settings.userEarnPoints === enums.EARN_POINTS.FROM_FTQ) {
        if (state.settings.features.length === 1) {
          buildfire.navigation.navigateTo({
            instanceId: state.settings.features[0].instanceId,
          });
        } else {
          const items = [];
          state.settings.features.forEach((element) => {
            items.push({
              text: element.title,
              instanceId: element.instanceId,
              iconUrl: element.iconUrl,
            });
          });
          buildfire.components.drawer.open({ listItems: items },
            (err, result) => {
              if (err) return console.error(err);
              buildfire.components.drawer.closeDrawer();
              buildfire.navigation.navigateTo({
                instanceId: result.instanceId,
              });
            });
        }
      } else {
        this.openScoreDialog('add');
      }
    } else {
      authManager.enforceLogin();
    }
  },

  initScoreDialog() {
    this.addEditScoreDialog = new mdc.dialog.MDCDialog(document.getElementById('addScoreDialog'));
    this.addEditScoreDialog.listen('MDCDialog:opened', () => {
      // Assuming contentElement references a common parent element with the rest of the page's content
      contentElement.setAttribute('aria-hidden', 'true');
    });

    this.addEditScoreDialog.listen('MDCDialog:closing', (event) => {
      contentElement.removeAttribute('aria-hidden');
    });
  },

  init() {
    buildfire.appearance.titlebar.show();

    const promises = [widgetController.getScores(enums.Keys.overall), widgetController.init(), initLanguageStrings()];
    Promise.all(promises).then(([scores]) => {
      document.getElementById('main_container').classList.remove('hidden');

      this.view = new buildfire.components.carousel.view('#carousel', []);
      this.initScoreDialog();

      this.appendCarouselItems();
      this.printWYSIWYGContent();
      scoreSwipeableDrawer.init();

      if (authManager.currentUser) {
        this.checkForNewPoints();
      }

      this.handleCPSync();

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
