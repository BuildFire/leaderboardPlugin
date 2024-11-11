/* eslint-disable prefer-destructuring */
/* eslint-disable max-len */
const widgetController = {
  addEditUserScore(options) {
    return new Promise((resolve, reject) => {
      Promise.all([
        this.getScores(enums.Keys.daily),
        this.getScores(enums.Keys.weekly),
        this.getScores(enums.Keys.monthly),
        this.getScores(enums.Keys.overall),
      ]).then(([dailyScores, weeklyScores, monthlyScores, yearlyScores]) => {
        let userDailyScore = dailyScores.find((scoreObj) => scoreObj.userId === authManager.currentUser.userId)?.currentScore || 0;
        let userWeeklyScore = weeklyScores.find((scoreObj) => scoreObj.userId === authManager.currentUser.userId)?.currentScore || 0;
        let userMonthlyScore = monthlyScores.find((scoreObj) => scoreObj.userId === authManager.currentUser.userId)?.currentScore || 0;
        let userYearlyScore = yearlyScores.find((scoreObj) => scoreObj.userId === authManager.currentUser.userId)?.currentScore || 0;

        const { newScore, logType } = options;

        if (logType === 'edit') {
          userWeeklyScore = userWeeklyScore - userDailyScore + newScore;
          userMonthlyScore = userMonthlyScore - userDailyScore + newScore;
          userYearlyScore = userYearlyScore - userDailyScore + newScore;
          userDailyScore = newScore;
        } else if (logType === 'add') {
          userDailyScore += newScore;
          userWeeklyScore += newScore;
          userMonthlyScore += newScore;
          userYearlyScore += newScore;
        }

        const enabledNotifications = {
          daily: state.settings.notificationsFrequency.includes(enums.NOTIFICATION_FREQUENCIES.dailyChange),
          weekly: state.settings.notificationsFrequency.includes(enums.NOTIFICATION_FREQUENCIES.weeklyChange),
          monthly: state.settings.notificationsFrequency.includes(enums.NOTIFICATION_FREQUENCIES.monthlyChange),
          yearly: state.settings.notificationsFrequency.includes(enums.NOTIFICATION_FREQUENCIES.allTimeChange),
        };
        const logScores = [];
        logScores.push(new Promise((_resolve, _reject) => Scores.editScore(userDailyScore, enums.boardNames.Daily, enabledNotifications.daily, (err, result) => {
          if (err) return _reject(err);
          return _resolve(result);
        })));
        logScores.push(new Promise((_resolve, _reject) => Scores.editScore(userWeeklyScore, enums.boardNames.Weekly, enabledNotifications.weekly, (err, result) => {
          if (err) return _reject(err);
          return _resolve(result);
        })));
        logScores.push(new Promise((_resolve, _reject) => Scores.editScore(userMonthlyScore, enums.boardNames.Monthly, enabledNotifications.monthly, (err, result) => {
          if (err) return _reject(err);
          return _resolve(result);
        })));
        logScores.push(new Promise((_resolve, _reject) => Scores.editScore(userYearlyScore, enums.boardNames.Yearly, enabledNotifications.yearly, (err, result) => {
          if (err) return _reject(err);
          return _resolve(result);
        })));

        Promise.all(logScores).then((results) => resolve([userDailyScore, userWeeklyScore, userMonthlyScore, userYearlyScore])).catch(reject);
      }).catch(reject);
    });
  },

  checkForNewPoints() {
    const pointsPromises = [];
    if (state.settings.calculateLoyaltyPoints) {
      pointsPromises.push(this.getNewLoyaltyPoints());
    }

    if (state.settings.userEarnPoints === enums.EARN_POINTS.FROM_FTQ) {
      pointsPromises.push(this.getNewFTQPoints());
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
          this.addEditUserScore(options).then(() => {
            Promise.all([
              this.resetLoyaltyPoint(),
              this.resetFTQPoints(),
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

  getNewFTQPoints() {
    return new Promise((resolve, reject) => {
      const features = state.settings.features.filter((feature) => feature.instanceId);
      const promises = features.map((instance) => new Promise((_resolve, _reject) => {
        buildfire.appData.search({
          filter: {
            '$json.user._id': { $eq: authManager.currentUser.userId },
            '$json.isEarnedPoints': { $exists: false },
          },
          sort: { finishedDateTime: -1 },
          skip: 0,
        },
        `freeTextQuestionnaireSubmissions_${instance.instanceId}`, (err, res) => {
          if (err) return _reject(err);
          return _resolve(res);
        });
      }));

      Promise.all(promises).then(resolve).catch(reject);
    });
  },

  getNewLoyaltyPoints() {
    return new Promise((resolve, reject) => {
      buildfire.appData.search(
        {
          filter: {
            '$json.userId': { $eq: authManager.currentUser.userId },
          },
        },
        'userLoyaltyPoints',
        (err, result) => {
          if (err) return reject(err);
          return resolve(result);
        },
      );
    });
  },

  resetLoyaltyPoint() {
    return new Promise((resolve, reject) => {
      buildfire.appData.searchAndUpdate(
        { userId: { $eq: authManager.currentUser.userId } },
        { $set: { newPoints: 0 } },
        'userLoyaltyPoints',
        (err, result) => {
          if (err) return reject(err);
          return resolve(result);
        },
      );
    });
  },

  resetFTQPoints() {
    return new Promise((resolve, reject) => {
      const features = state.settings.features.filter((feature) => feature.instanceId);
      const promises = features.map((instance) => new Promise((_resolve, _reject) => {
        buildfire.appData.searchAndUpdate({
          '$json.user._id': { $eq: authManager.currentUser.userId },
          '$json.isEarnedPoints': { $exists: false },
        }, {
          isEarnedPoints: true,
        }, `freeTextQuestionnaireSubmissions_${instance.instanceId}`, (err, res) => {
          if (err) return _reject(err);
          return _resolve(res);
        });
      }));

      Promise.all(promises).then(resolve).catch(reject);
    });
  },

  getScores(leaderboardType) {
    return new Promise((resolve, reject) => {
      Scores.getScores({ leaderboardType, settings: { isSubscribedToPN: true } }, (err, scores) => {
        if (err) return reject(err);
        return resolve(scores);
      });
    });
  },

  getSettings() {
    return new Promise((resolve, reject) => {
      Settings.get()
        .then((settings) => resolve(new Setting(settings)))
        .catch(reject);
    });
  },

  init() {
    return new Promise((resolve, reject) => {
      const promises = [this.getSettings(), Wysiwygs.get(), Carousels.get()];
      Promise.all(promises).then(([settings, wysiwyg, carousel]) => {
        state.settings = settings;
        state.wysiwyg = wysiwyg;
        state.carousel = carousel.carouselItems;

        return resolve();
      }).catch(reject);
    });
  },
};
