/**
 * Created by danielhindi on 1/18/18.
 */

if (typeof (buildfire) == "undefined") throw ("please add buildfire.js first to use BuildFire services");
if (!buildfire.gamify) buildfire.gamify = {};


buildfire.gamify.Scoreboard = function (tagName, size, options) {
    this.size = size || 10;

    if (this.size < 1) this.size = 10;
    this.tagName = tagName || "scoreboard";
    this.pushGroupName = "scoreboard_" + this.tagName;
    this.options = options || {};


};

buildfire.gamify.Scoreboard.prototype = {
    size: 10
    , getScoreboard: function (callback) {
        buildfire.publicData.get(this.tagName, function (err, result) {

            if (err)
                callback(err);
            else {
                if (Array.isArray(result.data.topScores))
                    callback(undefined, result.data);
                else
                    callback(undefined, {
                        gamesPlayed: 0
                        , topScores: []
                    });
            }
        });
    }
    , reset: function (callback) {
        var data = {
            gamesPlayed: 0
            , topScores: []
        };
        buildfire.publicData.save(data, this.tagName, function () { return callback(null, "Success") });
    }
    , _PNEnabled: function () {
        return buildfire.notifications && buildfire.notifications.pushNotification;
    }
    , subscribe: function (cb) {
        /// if PushNotifications are available then subscribe to the group
        if (this._PNEnabled()) {
            buildfire.notifications.pushNotification.subscribe({ groupName: this.pushGroupName }, function (err) {
                if (err) console.error(err);
                if (cb) cb(err);
            });
            return true;
        } else
            return false;
    }
    , unsubscribe: function (cb) {
        /// if PushNotifications are available then unsubscribe from the group
        if (this._PNEnabled()) {
            buildfire.notifications.pushNotification.unsubscribe({ groupName: this.pushGroupName }, function (err) {
                if (err) console.error(err);
                if (cb) cb(err);
            });
            return true;
        } else
            return false;
    }
    , logScore: function (user, score, callback) {

        if (!user.id && user._id) user.id = user._id;

        if (this.options.autoSubscribeToPushNotification) {
            if (!this.subscribe()) {
                console.warn("Cannot subscribe to scoreboard push notifications because buildfire push notification services is not attached");
            }
        }

        var t = this;
        var ts = new Date();
        buildfire.publicData.get(this.tagName, function (err, result) {


            var newRec = { user: user, score: score, createdOn: ts };

            var data = {
                gamesPlayed: 0
                , topScores: [newRec]
            };
            if (err)
                return callback(err);
            else if (result) {

                if (!Array.isArray(result.data.topScores)) {
                    data.gamesPlayed++;
                    buildfire.publicData.save(data, t.tagName, err => {
                        if (err)
                            callback(err);
                        else
                            callback(null, { rankedAt: 0 });
                    });
                }
                else {


                    /// check if your score is greater than the lowest one
                    if (result.data.topScores.length > t.size) {
                        if (result.data.topScores[t.size - 1].score > score) /// nothing to do here you didnt make the list
                            return callback(null, { rankedAt: null });
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
                        if (found < 0)
                            data.topScores.push(newRec);
                    }
                    else
                        data.topScores.push(newRec);

                    if (t.options.sortAscending) {
                        data.topScores = data.topScores.sort(function (a, b) {
                            return a.score - b.score;
                        });
                    }
                    else {
                        data.topScores = data.topScores.sort(function (a, b) {
                            return b.score - a.score;
                        });
                    }

                    var bumpedOff;
                    if (data.topScores.length > t.size)
                        bumpedOff = data.topScores.pop();

                    data.gamesPlayed++;
                    buildfire.publicData.update(result.id, data, t.tagName, err => {
                        if (err)
                            return callback(err);

                        var rankedAt;
                        for (var i = 0; i < data.topScores.length; i++) {
                            if (data.topScores[i].createdOn == ts) {
                                rankedAt = i;
                                break;
                            }
                        }
                        var obj = { bumpedOff: bumpedOff, rankedAt: rankedAt };

                        if (t._PNEnabled()) {

                            if (obj.bumpedOff && obj.bumpedOff.user.email != user.email) {

                                //send notification
                                buildfire.notifications.pushNotification.schedule({
                                    title: "You got kicked off !!!"
                                    , text: "Your old score is no longer on the top 10. " + user.displayName + " has taken your spot. Honestly, I dont know how you sleep at night."
                                    //,at: new Date()
                                    , users: [obj.bumpedOff.user.id]
                                }, e => { if (e) console.error(e) });
                            }

                            if (rankedAt == 0) {
                                buildfire.notifications.pushNotification.schedule({
                                    title: "There is a new champion!"
                                    , text: user.displayName + " has taken the lead at the new undisputed champion with a score of " + score
                                    , groupName: t.pushGroupName
                                }, e => { if (e) console.error(e) });
                            }

                            if (rankedAt == 1) {
                                buildfire.notifications.pushNotification.schedule({
                                    title: "There is a challenger to the champion"
                                    , text: user.displayName + " has taken 2nd place with a score of " + score + ". Watch out " + data.topScores[0].user.displayName
                                    , groupName: t.pushGroupName
                                }, e => { if (e) console.error(e) });
                            }

                            if (rankedAt == 2) {
                                buildfire.notifications.pushNotification.schedule({
                                    title: "There is a kid in town!"
                                    , text: user.displayName + " has taken 3rd place. Keep an eye on this one"
                                    , groupName: t.pushGroupName
                                }, e => { if (e) console.error(e) });
                            }

                        }

                        callback(null, obj);
                    });
                }

            }
            else {
                data.gamesPlayed++;
                buildfire.publicData.save(data, t.tagName, err => {
                    if (err)
                        callback(err);
                    else
                        callback(null, { rankedAt: 0 });
                });

            }

        });
    }
};