let settings = null;
const ftqFeautreItems = [];
const ftqFeaturesContainer = document.getElementById('ftqFeaturesContainer');
const honorSystemRadioBtn = document.getElementById('honorSystem');
const scoreFromFreeTextQuestionnaireadioBtn = document.getElementById('scoreFromFreeTextQuestionnaire');

const dailyChange = document.getElementById('dailyChange');
const weeklyChange = document.getElementById('weeklyChange');
const monthlyChange = document.getElementById('monthlyChange');
const allTimeChange = document.getElementById('allTimeChange');
const enableCalculatePoints = document.getElementById('enableCalculatePoints');

let ftqFeatures = null;
// Register push notifications event
const load = () => {
  for (const propName in analyticKeys) {
    buildfire.analytics.registerEvent(
      analyticKeys[propName],
      {
        silentNotification: true,
      },
    );
  }
  initFeatureActions();
  initNotificationFrequencyCheckboxes();
  initUserEarnPointsRadioBtns();
  initSettings();
};

const initSettings = () => {
  buildfire.datastore.get('Settings', (err, result) => {
    if (err || !result) {
      console.error(err, 'Error while getting datastore.');
      buildfire.dialog.toast({
        message: 'Error while loading data. Retrying again in 2 seconds...',
        duration: 1999,
      });
      setTimeout(() => {
        location.reload();
      }, 2000);
      return;
    }
    if (result && result.data) {
      settings = result.data;

      if (settings.userEarnPoints && settings.userEarnPoints == scoreFromFreeTextQuestionnaireadioBtn.value) {
        scoreFromFreeTextQuestionnaireadioBtn.setAttribute('checked', true);
      } else {
        ftqFeaturesContainer.style.display = 'none';
        honorSystemRadioBtn.setAttribute('checked', true);
      }

      if (settings.calculateLoyaltyPoints && settings.calculateLoyaltyPoints == true) {
        enableCalculatePoints.checked = true;
      }

      if (settings.features && settings.features.length > 0) {
        ftqFeatures.loadItems(settings.features);
        changeActionItemsIcon();
      } else {
        settings.features = [];
      }

      if (settings.notificationsFrequency && settings.notificationsFrequency.length > 0) {
        settings.notificationsFrequency.forEach((notificationFrequency) => {
          if (notificationFrequency == dailyChange.value) {
            dailyChange.checked = true;
          } else if (notificationFrequency == weeklyChange.value) {
            weeklyChange.checked = true;
          } else if (notificationFrequency == monthlyChange.value) {
            monthlyChange.checked = true;
          } else if (notificationFrequency == allTimeChange.value) {
            allTimeChange.checked = true;
          }
        });
      } else {
        settings.notificationsFrequency = [];
      }
    }
  });
};

const setEnableCalculatePoints = () => {
  if (enableCalculatePoints.checked) {
    settings.calculateLoyaltyPoints = true;
  } else {
    settings.calculateLoyaltyPoints = false;
  }
  save();
};

const changeActionItemsIcon = () => {
  Array.from(document.querySelectorAll('.btn-icon.btn-delete-icon')).forEach(
    (el) => {
      el.classList.remove('btn-icon', 'btn-delete-icon', 'btn-danger');
      el.classList.add('icon', 'icon-cross2');
    },
  );
};

const initUserEarnPointsRadioBtns = () => {
  scoreFromFreeTextQuestionnaireadioBtn.addEventListener('input', (evt) => {
    if (settings && settings.userEarnPoints != evt.target.value) {
      settings.userEarnPoints = evt.target.value;
      ftqFeaturesContainer.style.display = 'block';
      save();
    }
  });
  honorSystemRadioBtn.addEventListener('input', (evt) => {
    if (settings && settings.userEarnPoints != evt.target.value) {
      settings.userEarnPoints = evt.target.value;
      ftqFeaturesContainer.style.display = 'none';

      save();
    }
  });
};

const initNotificationFrequencyCheckboxes = () => {
  dailyChange.addEventListener('input', (evt) => {
    if (evt.target.checked) {
      settings.notificationsFrequency.push(evt.target.value);
    } else {
      settings.notificationsFrequency = settings.notificationsFrequency.filter((x) => x != evt.target.value);
    }
    save();
  });
  weeklyChange.addEventListener('input', (evt) => {
    if (evt.target.checked) {
      settings.notificationsFrequency.push(evt.target.value);
    } else {
      settings.notificationsFrequency = settings.notificationsFrequency.filter((x) => x != evt.target.value);
    }
    save();
  });
  monthlyChange.addEventListener('input', (evt) => {
    if (evt.target.checked) {
      settings.notificationsFrequency.push(evt.target.value);
    } else {
      settings.notificationsFrequency = settings.notificationsFrequency.filter((x) => x != evt.target.value);
    }
    save();
  });
  allTimeChange.addEventListener('input', (evt) => {
    if (evt.target.checked) {
      settings.notificationsFrequency.push(evt.target.value);
    } else {
      settings.notificationsFrequency = settings.notificationsFrequency.filter((x) => x != evt.target.value);
    }
    save();
  });
};

const initFeatureActions = () => {
  ftqFeatures = new buildfire.components.actionItems.sortableList(
    '.ftqFeatures',
  );
  document.querySelector('.add-new-item').innerHTML = 'Add Feature';

  ftqFeatures.onAddItems = function (item) {
    item.order = settings.features.length;
    settings.features.push(item);
    buildfire.datastore.save(settings, 'Settings', (err, result) => {
      if (err || !result) {
        console.error('Error saving the widget details: ', err);
      }
    });

    changeActionItemsIcon();
  };

  ftqFeatures.onDeleteItem = function (item, index) {
    settings.features.splice(index, 1);
    save();
  };

  ftqFeatures.onOrderChange = function (item, oldIndex, newIndex) {
    const items = settings.features;

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

    settings.features = items;
    save();
  };

  ftqFeatures.onItemChange = (item, index) => {
    settings.features[index] = item;
    save();
  };

  const ftqContainer = ftqFeatures.selector.childNodes[0];
  ftqContainer.removeChild(ftqContainer.childNodes[0]);
  ftqContainer.childNodes[0].classList.remove('col-md-9');
  ftqContainer.childNodes[0].classList.add('col-md-12');

  const ftqButton = ftqContainer.childNodes[0].childNodes[0];
  ftqButton.childNodes[0].style.float = 'right !important';
  ftqButton.childNodes[0].classList.remove('pull-left');
  ftqButton.childNodes[0].classList.add('pull-right');
};

const save = () => {
  buildfire.datastore.save(settings, 'Settings', (err, result) => {
    if (err || !result) {
      console.error('Error saving the widget details: ', err);
    }
  });
};

// reset all leaderboards
const reset = () => {
  buildfire.dialog.confirm(
    {
      title: 'Reset Leaderboard',
      message: 'Are you sure you want to reset leaderboard? This will delete all entries and scores in the leaderboard!',
      confirmButton: {
        text: 'Reset',
        type: 'danger',
      },
      cancelButtonText: 'Cancel',
    },
    (err, isConfirmed) => {
      if (err) console.error(err);

      if (isConfirmed) {
        UserSettings.get((err, settings) => {
          if (err) return console.log(err);
          if (settings && settings.isSubscribedToPN) {
            Scores.reset({ isSubscribedToPN: settings.isSubscribedToPN }, (err, res) => {
              if (err) return console.log(err);
              buildfire.messaging.sendMessageToWidget('Reset');

              buildfire.dialog.toast({
                type: 'success',
                message: 'Leaderboard has been successfully reset!',
              });
            });
          }
        });
      }
    },
  );
};

load();
