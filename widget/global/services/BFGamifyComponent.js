/**
 * Created by danielhindi on 1/18/18.
 */

if (typeof (buildfire) === 'undefined') throw ('please add buildfire.js first to use BuildFire services');
if (!buildfire.gamify) buildfire.gamify = {};

buildfire.gamify.Scoreboard = function (tagName, size, options) {
  this.size = size || 10;

  if (this.size < 1) this.size = 10;
  this.tagName = tagName || 'scoreboard';
  this.pushGroupName = `scoreboard_${this.tagName}`;
  this.options = options || {};
};

buildfire.gamify.Scoreboard.prototype = {
  size: 10,
  getScoreboard(callback) {
    buildfire.publicData.get(this.tagName, (err, result) => {
      if (err) { callback(err); } else if (Array.isArray(result.data.topScores)) { callback(undefined, result.data); } else {
        callback(undefined, {
          gamesPlayed: 0,
          topScores: [],
        });
      }
    });
  },
  reset(callback) {
    const data = {
      gamesPlayed: 0,
      topScores: [],
    };
    buildfire.publicData.save(data, this.tagName, () => callback(null, 'Success'));
  },
  _PNEnabled() {
    return buildfire.notifications && buildfire.notifications.pushNotification;
  },
  subscribe(cb) {
    /// if PushNotifications are available then subscribe to the group
    if (this._PNEnabled()) {
      buildfire.notifications.pushNotification.subscribe({ groupName: this.pushGroupName }, (err) => {
        if (err) console.error(err);
        if (cb) cb(err);
      });
      return true;
    } return false;
  },
  unsubscribe(cb) {
    /// if PushNotifications are available then unsubscribe from the group
    if (this._PNEnabled()) {
      buildfire.notifications.pushNotification.unsubscribe({ groupName: this.pushGroupName }, (err) => {
        if (err) console.error(err);
        if (cb) cb(err);
      });
      return true;
    } return false;
  },
  logScore(user, score, boardName, isNotifyingUser, callback) {
    if (!user.id && user._id) user.id = user._id;

    if (this.options.autoSubscribeToPushNotification) {
      if (!this.subscribe()) {
        console.warn('Cannot subscribe to scoreboard push notifications because buildfire push notification services is not attached');
      }
    }

    const t = this;
    const ts = new Date();
    buildfire.publicData.get(this.tagName, (err, result) => {
      let previousTopThree = [];
      if (result.data.topScores) {
        if (result.data.topScores?.length > 3) {
          previousTopThree = [result.data.topScores[0], result.data.topScores[1], result.data.topScores[2]];
        } else {
          previousTopThree = [...result.data.topScores];
        }
      }

      console.log('previousTopThree', previousTopThree);

      const newRec = { user, score, createdOn: ts };

      let data = {
        gamesPlayed: 0,
        topScores: [newRec],
      };
      if (err) { return callback(err); }
      if (result) {
        if (!Array.isArray(result.data.topScores)) {
          data.gamesPlayed++;
          buildfire.publicData.save(data, t.tagName, (err) => {
            if (err) { callback(err); } else { callback(null, { rankedAt: 0 }); }
          });
        } else {
          /// check if your score is greater than the lowest one
          if (result.data.topScores.length > t.size) {
            if (result.data.topScores[t.size - 1].score > score) /// nothing to do here you didnt make the list
            { return callback(null, { rankedAt: null }); }
          }

          data = result.data;
          if (t.options.overrideRecords) {
            let found = -1;

            for (let i = 0; i < data.topScores.length; i++) {
              if (data.topScores[i].user.id == user.id) {
                found = i;
                data.topScores[i] = newRec;
                break;
              }
            }
            if (found < 0) { data.topScores.push(newRec); }
          } else { data.topScores.push(newRec); }

          if (t.options.sortAscending) {
            data.topScores = data.topScores.sort((a, b) => a.score - b.score);
          } else {
            data.topScores = data.topScores.sort((a, b) => b.score - a.score);
          }

          let bumpedOff;

          if (data.topScores.length > 3) {
            var newTopThree = [data.topScores[0], data.topScores[1], data.topScores[2]];
          } else {
            var newTopThree = data.topScores;
          }

          console.log('previousTopThree', previousTopThree);
          console.log('newTopThree', newTopThree);

          // Check if the new score is in top 3
          if (user.id == newTopThree[0].user.id || user.id == newTopThree[1].user.id || user.id == newTopThree[2].user.id) {
            // Check if it is a different rank
            // Check if user score is in previous
            let userPreviousRank = null;
            for (let i = 0; i < previousTopThree.length; i++) {
              if (previousTopThree[i].user.id == user.id) {
                userPreviousRank = i;
                break;
              }
            }

            if (userPreviousRank != null) {
              // Check if user score is in new
              let userNewRank = null;
              for (let i = 0; i < newTopThree.length; i++) {
                if (newTopThree[i].user.id == user.id) {
                  userNewRank = i;
                  break;
                }
              }

              if (userNewRank != null) {
                if (userNewRank != userPreviousRank) {
                  // a user is bumped off
                  bumpedOff = previousTopThree[userNewRank];
                  if (bumpedOff) {
                    if (userNewRank == 0) {
                      bumpedOff.position = 'first';
                    } else if (userNewRank == 1) {
                      bumpedOff.position = 'second';
                    } else if (userNewRank == 2) {
                      bumpedOff.position = 'third';
                    }
                  }
                }
              }
            } else {
              // user is new to top 3
              let userNewRank = null;
              for (let i = 0; i < newTopThree.length; i++) {
                if (newTopThree[i].user.id == user.id) {
                  userNewRank = i;
                  bumpedOff = previousTopThree[userNewRank];
                  if (bumpedOff) {
                    if (userNewRank == 0) {
                      bumpedOff.position = 'first';
                    } else if (userNewRank == 1) {
                      bumpedOff.position = 'second';
                    } else if (userNewRank == 2) {
                      bumpedOff.position = 'third';
                    }
                  }
                  break;
                }
              }
            }

            console.log('bumpedOff', bumpedOff);
          }

          data.gamesPlayed++;
          buildfire.publicData.update(result.id, data, t.tagName, (err) => {
            if (err) { return callback(err); }

            let rankedAt;
            for (let i = 0; i < data.topScores.length; i++) {
              if (data.topScores[i].createdOn == ts) {
                rankedAt = i;
                break;
              }
            }
            const obj = {
              bumpedOff,
              rankedAt,
              userDisplayName: user.displayName || user.firstName + user.lastName || user.firstName || 'someone',
              bumpedDisplayName: bumpedOff ? bumpedOff.user.displayName || bumpedOff.user.firstName + bumpedOff.user.lastName || bumpedOff.user.firstName || 'someone' : null,
            };

            if (t._PNEnabled() && isNotifyingUser) {
              if (rankedAt == 0) {
                console.log('send message', `${obj.userDisplayName} is now at first place in the ${boardName} board! Can you take over?`);
                buildfire.notifications.pushNotification.schedule({
                  title: 'New HighScore!',
                  text: `${obj.userDisplayName} is now at first place in the ${boardName} board! Can you take over?`,
                  groupName: t.pushGroupName,
                  sendToSelf: false,
                }, (e) => { if (e) console.error(e); });
              } else if (obj.bumpedOff && obj.bumpedOff.user.email != user.email) {
                console.log('sent message', `${obj.userDisplayName} took over ${bumpedOff.position} place from ${obj.bumpedDisplayName}`);
                // send notification
                buildfire.notifications.pushNotification.schedule({
                  title: 'Things are heating at the top!',
                  text: `${obj.userDisplayName} took over ${bumpedOff.position} place from ${obj.bumpedDisplayName} In the ${boardName} board!`,
                  // , at: new Date()
                  groupName: t.pushGroupName,
                  sendToSelf: false,
                }, (e) => { if (e) console.error(e); });
              }
            }

            callback(null, obj);
          });
        }
      } else {
        data.gamesPlayed++;
        buildfire.publicData.save(data, t.tagName, (err) => {
          if (err) { callback(err); } else { callback(null, { rankedAt: 0 }); }
        });
      }
    });
  },
};
