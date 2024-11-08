const settingsController = {
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
          UserSettings.get((error, settings) => {
            if (error) return console.error(error);
            if (settings && settings.isSubscribedToPN) {
              Scores.reset({ isSubscribedToPN: settings.isSubscribedToPN }, (e, res) => {
                if (e) return console.error(e);
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
