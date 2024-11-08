class AnalyticsManager {
  static registerEvents() {
    return new Promise((resolve, reject) => {
      buildfire.analytics.bulkRegisterEvents(
        [
          {
            title: 'New Scores Logged',
            key: 'score-logged',
            description: 'The number of new scores logged to the leaderboard.',
          },
        ],
        { silentNotification: true }, (err, result) => {
          if (err) return reject(err);
          return resolve(result);
        },
      );
    });
  }

  static trackAction(event) {
    buildfire.analytics.trackAction(event);
  }
}
