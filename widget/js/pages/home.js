const homePage = {
  printWYSIWYGContent() {
    document.getElementById('my_container_div').innerHTML = state.wysiwyg.content || '';
  },

  appendCarouselItems() {
    if (state.carousel && state.carousel.length) {
      this.view.loadItems(state.carousel);
    }
  },

  openScoreDialog(dialogType = 'add') {
    buildfire.components.swipeableDrawer.setStep('min');

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
    document.getElementById('main_container').classList.remove('hidden');

    this.view = new buildfire.components.carousel.view('#carousel', []);

    const fabOptions = {
      mainButton: {
        content: `<i class="icon fab-icon-btn">
                        <svg width="14" height="14" viewBox="0 0 14 14"  xmlns="http://www.w3.org/2000/svg" fill="#ffffff">
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M14 8H8V14H6V8H0V6H6V0H8V6H14V8Z"/>
                        </svg>
                    </i>`,
        label: 'Add Points',
        type: 'success',
        key: 'addPoints',
      },
    };
    const addPointsFab = new buildfire.components.fabSpeedDial('#fabSpeedDialContainer', fabOptions);
    addPointsFab.onMainButtonClick = homePage.showAddScoreView.bind(this);

    homePage.initScoreDialog();
    homePage.appendCarouselItems();
    homePage.printWYSIWYGContent();
  },
};
