/* eslint-disable max-len */
const settingPage = {
  uiElements: {},
  initUIElements() {
    this.uiElements.ftqFeaturesContainer = document.getElementById('ftqFeaturesContainer');
    this.uiElements.honorSystemRadioBtn = document.getElementById('honorSystem');
    this.uiElements.scoreFromFreeTextQuestionnaireadioBtn = document.getElementById('scoreFromFreeTextQuestionnaire');

    this.uiElements.dailyChange = document.getElementById('dailyChange');
    this.uiElements.weeklyChange = document.getElementById('weeklyChange');
    this.uiElements.monthlyChange = document.getElementById('monthlyChange');
    this.uiElements.allTimeChange = document.getElementById('allTimeChange');
    this.uiElements.enableCalculatePoints = document.getElementById('enableCalculatePoints');
  },

  syncWithWidget(cmd, data) {
    buildfire.messaging.sendMessageToWidget({ cmd, data });
  },

  initEventListeners() {
    this.uiElements.dailyChange.onchange = (event) => {
      if (event.target.checked) {
        state.settings.notificationsFrequency.push(enums.NOTIFICATION_FREQUENCIES.dailyChange);
      } else {
        state.settings.notificationsFrequency = state.settings.notificationsFrequency
          .filter((frequency) => frequency !== enums.NOTIFICATION_FREQUENCIES.dailyChange);
      }
      this.saveSettingsWithDelay();
    };
    this.uiElements.weeklyChange.onchange = (event) => {
      if (event.target.checked) {
        state.settings.notificationsFrequency.push(enums.NOTIFICATION_FREQUENCIES.weeklyChange);
      } else {
        state.settings.notificationsFrequency = state.settings.notificationsFrequency
          .filter((frequency) => frequency !== enums.NOTIFICATION_FREQUENCIES.weeklyChange);
      }
      this.saveSettingsWithDelay();
    };
    this.uiElements.monthlyChange.onchange = (event) => {
      if (event.target.checked) {
        state.settings.notificationsFrequency.push(enums.NOTIFICATION_FREQUENCIES.monthlyChange);
      } else {
        state.settings.notificationsFrequency = state.settings.notificationsFrequency
          .filter((frequency) => frequency !== enums.NOTIFICATION_FREQUENCIES.monthlyChange);
      }
      this.saveSettingsWithDelay();
    };
    this.uiElements.allTimeChange.onchange = (event) => {
      if (event.target.checked) {
        state.settings.notificationsFrequency.push(enums.NOTIFICATION_FREQUENCIES.allTimeChange);
      } else {
        state.settings.notificationsFrequency = state.settings.notificationsFrequency
          .filter((frequency) => frequency !== enums.NOTIFICATION_FREQUENCIES.allTimeChange);
      }
      // todo: here to save
    };

    this.uiElements.honorSystemRadioBtn.oninput = (event) => {
      if (event.target.checked) {
        state.settings.userEarnPoints = enums.EARN_POINTS.HONOR_SYSTEM;
      }
      this.saveSettingsWithDelay();
    };

    this.uiElements.scoreFromFreeTextQuestionnaireadioBtn.oninput = (event) => {
      if (event.target.checked) {
        state.settings.userEarnPoints = enums.EARN_POINTS.FROM_FTQ;
      }
      this.saveSettingsWithDelay();
    };

    this.uiElements.enableCalculatePoints.onchange = (event) => {
      state.settings.calculateLoyaltyPoints = event.target.checked;
      this.saveSettingsWithDelay();
    };
  },

  initFeatureActions() {
    const changeActionItemsIcon = () => {
      Array.from(document.querySelectorAll('.btn-icon.btn-delete-icon')).forEach(
        (el) => {
          el.classList.remove('btn-icon', 'btn-delete-icon', 'btn-danger');
          el.classList.add('icon', 'icon-cross2');
        },
      );
    };
    ftqFeatures = new buildfire.components.actionItems.sortableList('.ftqFeatures');
    document.querySelector('.add-new-item').innerHTML = 'Add Feature';

    ftqFeatures.onAddItems = function (item) {
      item.order = state.settings.features.length;
      state.settings.features.push(item);

      settingPage.saveSettingsWithDelay();
      changeActionItemsIcon();
    };

    ftqFeatures.onDeleteItem = function (item, index) {
      state.settings.features.splice(index, 1);
      settingPage.saveSettingsWithDelay();
    };

    ftqFeatures.onOrderChange = function (item, oldIndex, newIndex) {
      const items = state.settings.features;

      items[oldIndex].order = newIndex;

      const tmp = items[oldIndex];

      if (oldIndex < newIndex) {
        for (var i = oldIndex + 1; i <= newIndex; i++) {
          items[i - 1] = items[i];
        }
      } else {
        for (var i = oldIndex - 1; i >= newIndex; i--) {
          items[i + 1] = items[i];
        }
      }

      items[newIndex] = tmp;

      state.settings.features = items;
      settingPage.saveSettingsWithDelay();
    };

    const ftqContainer = ftqFeatures.selector.childNodes[0];
    ftqContainer.removeChild(ftqContainer.childNodes[0]);
    ftqContainer.childNodes[0].classList.remove('col-md-9');
    ftqContainer.childNodes[0].classList.add('col-md-12');

    const ftqButton = ftqContainer.childNodes[0].childNodes[0];
    ftqButton.childNodes[0].style.float = 'right !important';
    ftqButton.childNodes[0].classList.remove('pull-left');
    ftqButton.childNodes[0].classList.add('pull-right');

    if (state.settings.features && state.settings.features.length > 0) {
      ftqFeatures.loadItems(state.settings.features);
      changeActionItemsIcon();
    }
  },

  saveSettingsWithDelay() {
    this.updateUI();
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      settingsController.saveSettings().then(() => {
        this.syncWithWidget('settings', state.settings);
      }).catch((err) => {
        console.error(err);
      });
    }, 500);
  },

  updateUI() {
    this.uiElements.enableCalculatePoints.checked = state.settings.calculateLoyaltyPoints;

    if (state.settings.userEarnPoints === enums.EARN_POINTS.HONOR_SYSTEM) {
      this.uiElements.honorSystemRadioBtn.checked = true;
      this.uiElements.ftqFeaturesContainer.classList.add('hidden');
    } else if (state.settings.userEarnPoints === enums.EARN_POINTS.FROM_FTQ) {
      this.uiElements.scoreFromFreeTextQuestionnaireadioBtn.checked = true;
      this.uiElements.ftqFeaturesContainer.classList.remove('hidden');
    }

    if (state.settings.notificationsFrequency.includes(enums.NOTIFICATION_FREQUENCIES.dailyChange)) {
      this.uiElements.dailyChange.checked = true;
    }
    if (state.settings.notificationsFrequency.includes(enums.NOTIFICATION_FREQUENCIES.weeklyChange)) {
      this.uiElements.weeklyChange.checked = true;
    }
    if (state.settings.notificationsFrequency.includes(enums.NOTIFICATION_FREQUENCIES.monthlyChange)) {
      this.uiElements.monthlyChange.checked = true;
    }
    if (state.settings.notificationsFrequency.includes(enums.NOTIFICATION_FREQUENCIES.allTimeChange)) {
      this.uiElements.allTimeChange.checked = true;
    }
  },

  init() {
    Promise.all([
      settingsController.getSettings(),
      authManager.refreshCurrentUser(),
    ]).then(() => {
      this.initUIElements();
      this.initFeatureActions();
      this.updateUI();

      this.initEventListeners();
    }).catch((err) => {
      console.error(err);
    });
  },
};

window.onload = () => {
  settingPage.init();
};
