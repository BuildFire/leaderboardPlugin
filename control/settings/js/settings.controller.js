const settingsController = {
  getSettings() {
    return new Promise((resolve, reject) => {
      buildfire.datastore.get('Settings', (err, result) => {
        if (err) return reject(err);
        state.settings = new Settings(result.data);
        return resolve(result.data);
      });
    });
  },

  saveSettings() {
    return new Promise((resolve, reject) => {
      buildfire.datastore.save({ ...state.settings }, 'Settings', (err, result) => {
        if (err) return reject(err);
        return resolve(result);
      });
    });
  },

  reset() {
    // reset all leaderboards
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
                settingPage.syncWithWidget('reset');

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
  },
};
