class Scores {

    /**
     * Searches scoreboard for a previous score of the user
     * @param {String} userID id of the user
     * @param {Object} scoreBoard the scoreboard to search in
    */
    static _getUserPreviousScore = (userId, scoreBoard) => {
        let prevScore = 0;

        if (scoreBoard.length == 0) return prevScore;
        // let x = scoreBoard.findIndex(s => s.userId == userId);
        scoreBoard.forEach(score => {
            if (score.user._id === userId) {
                prevScore = score.score;
            }
        })
        return prevScore;
    }

    static _getUserRank = (userId, scoreBoard) => {
        let score = 0;
        let rank = -1;
        if (scoreBoard.length == 0) return { rank: rank, score: score };
        // let x = scoreBoard.findIndex(s => s.userId == userId);
        for (let i = 0; i < scoreBoard.length; i++) {
            const element = scoreBoard[i];
            if (element.user._id === userId) {
                score = element.score;
                rank = i + 1;
                return { rank: rank, score: score };
            }
        }
        return { rank: rank, score: score };
    }


    static getCurrentUserRank = (scoreBoard, callback) => {
        if (!authManager.currentUser) return callback("User not logged in");
        let user = authManager.currentUser;
        //Check if user participated in the current board
        let tag = ''

        //Set a standard date for the leaderboard to avoid timezone conflicts
        let date = this.getStandardDate(new Date(), "America/Los_Angeles")

        //Get the tag of the leaderboard
        if (scoreBoard === Keys.daily) {
            tag = this.getDailyTag(date)
        }

        else if (scoreBoard === Keys.weekly) {
            tag = this.getWeeklyTag(date)
        }

        else if (scoreBoard === Keys.monthly) {
            tag = this.getMonthlyTag(date)
        }

        else if (scoreBoard === Keys.overall) {
            tag = this.getYearlyTag(date)
        }

        // Get the user's rank
        let sb = new buildfire.gamify.Scoreboard(tag, 100, {
            autoSubscribeToPushNotification: true
            , overrideRecords: true
            , sortAscending: false
        });

        // Fetch the top scorers
        sb.getScoreboard((err, scoreboard) => {
            if (err) return callback("Error fetching scoreboard");
            if (scoreboard.topScores.length > 0) {
                return callback(null, this._getUserRank(user._id, scoreboard.topScores))
            }

            else {
                return callback("Scoreboard is empty", null)
            }
        })
    }

    static checkIfAllEmpty = (callback) => {
        //If yearly board is empty then all boards are
        let date = this.getStandardDate(new Date(), "America/Los_Angeles")
        let yearlyTag = this.getYearlyTag(date)

        let sb = new buildfire.gamify.Scoreboard(yearlyTag, 100, {
            autoSubscribeToPushNotification: true
            , overrideRecords: true
            , sortAscending: false
        });

        sb.getScoreboard((error, scoreboard) => {
            if (error) return callback(error);
            if (scoreboard.topScores.length > 0) {
                return callback(false);
            }
            else {
                return callback(true);
            }
        });
    }

    /**
     * Returns the scoreboard with a specific time option
     * @param {Object} data object containing the settings and string to identify which date scoreboard to return
     * @param {Function} callback callback for handling response
    */
    static getScores = (data, callback) => {
        let scores = []
        let tag = ''

        //Set a standard date for the leaderboard to avoid timezone conflicts
        let date = this.getStandardDate(new Date(), "America/Los_Angeles")

        //Get the tag of the leaderboard
        if (data.leaderboardType === Keys.daily) {
            tag = this.getDailyTag(date)
        }

        else if (data.leaderboardType === Keys.weekly) {
            tag = this.getWeeklyTag(date)
        }

        else if (data.leaderboardType === Keys.monthly) {
            tag = this.getMonthlyTag(date)
        }

        else if (data.leaderboardType === Keys.overall) {
            tag = this.getYearlyTag(date)
        }

        //Get the scoreboard 
        let sb = new buildfire.gamify.Scoreboard(tag, 100, {
            autoSubscribeToPushNotification: data.settings.isSubscribedToPN
            , overrideRecords: true
            , sortAscending: false
        });

        // Fetch the top scorers
        sb.getScoreboard((err, scoreboard) => {
            if (err) return callback("Error fetching scoreboard");
            if (scoreboard.topScores.length > 0) {
                scoreboard.topScores.forEach((element, index) => {
                    let width = 40;
                    let height = 40;

                    if (index == 0) {
                        width = 80;
                        height = 80;
                    }

                    if (index == 1) {
                        width = 64;
                        height = 64;
                    }

                    if (index == 2) {
                        width = 64;
                        height = 64;
                    }
                    let imgURL = buildfire.imageLib.cropImage(buildfire.auth.getUserPictureUrl({userId: element.user._id}) ,{width:width,height:height})
                    
                    scores.push(new Score({
                        createdOn: element.createdOn,
                        lastUpdatedOn: element.user.lastUpdated,
                        userId: element.user._id,
                        displayName: element.user.displayName || element.user.firstName + element.user.lastName || element.user.firstName || 'someone',
                        currentScore: element.score,
                        displayPictureUrl: imgURL
                    }))
                });

            }
            callback(null, scores)
        });
    }

    /**
     * Tranforms date specified to a different timezone
     * @param {Date} date The date to switch to a standard timezone
     * @param {String} tzString String to specify the timezone
    */
    static getStandardDate = (date, tzString) => {
        return new Date((typeof date === "string" ? new Date(date) : date).toLocaleString("en-US", { timeZone: tzString }));
    }

    /**
     * Returns a string of the date of the local current day
     * @param {Date} date the date of today
    */
    static getDailyTag = (date) => {
        return "" + date.getDate() + (date.getMonth() + 1) + date.getFullYear()
    }

    /**
     * Returns a string with the number of the week in the month and year
     * @param {Date} date the date of today
    */
    static getWeeklyTag = (date) => {
        const startWeekDayIndex = 1; // 1 MonthDay 0 Sundays
        const firstDate = new Date(date.getFullYear(), date.getMonth(), 1);
        const firstDay = firstDate.getDay();

        let weekNumber = Math.ceil((date.getDate() + firstDay) / 7);
        if (startWeekDayIndex === 1) {
            if (date.getDay() === 0 && date.getDate() > 1) {
                weekNumber -= 1;
            }

            if (firstDate.getDate() === 1 && firstDay === 0 && date.getDate() > 1) {
                weekNumber += 1;
            }
        }
        return weekNumber.toString() + (date.getMonth() + 1) + date.getFullYear()
    }

    /**
     * Returns a string of the date of the current month and year
     * @param {Date} date the date of today
    */
    static getMonthlyTag = (date) => {
        return "" + (date.getMonth() + 1) + date.getFullYear()
    }

    /**
     * Returns a string of the date of the current year
     * @param {Date} date the date of today
    */
    static getYearlyTag = (date) => {
        return "" + date.getFullYear()
    }

    /**
    * Adds to the user previous score on all boards
    * @param {Object} data object containing settings and score
    * @param {Function} callback callback for handling response
    */
    static addScore = (data, callback) => {
        if (!authManager.currentUser) return callback("User not logged in");
        let user = authManager.currentUser;
        //Check for errors in settings
        if (typeof data.settings == 'undefined') return callback("Settings is undefined")
        if (data.settings.isSubscribedToPN === null) return callback("isSubscribedToPN is null")
        if (data.settings.isSubscribedToPN === "") return callback("isSubscribedToPN is empty")

        //Check for errors in score
        if (typeof data.score == 'undefined') return callback("Score cannot be undefined")
        if (data.score == null) return callback("Score cannot be null")
        if (data.score !== data.score) return callback("Score cannot be NaN")
        if (typeof data.score !== 'number') return callback("Score must be a number")
        if (data.score < 0) return callback("Score cannot be negative")
        if (data.score == 0) return callback("Score cannot be 0")


        // Get each scoreboard tag
        let date = this.getStandardDate(new Date(), "America/Los_Angeles")
        let dailyTag = this.getDailyTag(date)
        let weeklyTag = this.getWeeklyTag(date)
        let monthlyTag = this.getMonthlyTag(date)
        let yearlyTag = this.getYearlyTag(date)
        let rankedAt = -1;

        // Get the boards using their tags
        // TODO make the size config

        let dailyBoard = new buildfire.gamify.Scoreboard(dailyTag, 100, {
            autoSubscribeToPushNotification: data.settings.isSubscribedToPN
            , overrideRecords: true
            , sortAscending: false
        });
        let weeklyBoard = new buildfire.gamify.Scoreboard(weeklyTag, 100, {
            autoSubscribeToPushNotification: data.settings.isSubscribedToPN
            , overrideRecords: true
            , sortAscending: false
        });

        let monthlyBoard = new buildfire.gamify.Scoreboard(monthlyTag, 100, {
            autoSubscribeToPushNotification: data.settings.isSubscribedToPN
            , overrideRecords: true
            , sortAscending: false
        });

        let yearlyBoard = new buildfire.gamify.Scoreboard(yearlyTag, 100, {
            autoSubscribeToPushNotification: data.settings.isSubscribedToPN
            , overrideRecords: true
            , sortAscending: false
        });


        // Log score to daily board
        dailyBoard.getScoreboard((error, scoreboard) => {
            let sb = []
            if (error) return callback(error);
            if (scoreboard.topScores.length > 0) {
                sb = scoreboard.topScores;
            }
            let previousScore = this._getUserPreviousScore(user._id, sb)
            dailyBoard.logScore(user, parseInt(data.score) + previousScore, 'Daily', (err, result) => {
                if (err) return callback(err);
                if (result && result.rankedAt >= 0) {
                    rankedAt = result.rankedAt;
                }
            })
        });

        // Log score to weekly board
        weeklyBoard.getScoreboard((error, scoreboard) => {
            let sb = []
            if (error) return callback(error);
            if (scoreboard.topScores.length > 0) {
                sb = scoreboard.topScores;
            }
            let previousScore = this._getUserPreviousScore(user._id, sb)
            weeklyBoard.logScore(user, parseInt(data.score) + previousScore,'Weekly', (err, result) => {
                if (err) return callback(err);
                if (result && result.rankedAt >= 0) {
                    rankedAt = result.rankedAt;
                }
            })
        });

        // Log score to monthly board
        monthlyBoard.getScoreboard((error, scoreboard) => {
            let sb = []
            if (error) return callback(error);
            if (scoreboard.topScores.length > 0) {
                sb = scoreboard.topScores;
            }
            let previousScore = this._getUserPreviousScore(user._id, sb)
            monthlyBoard.logScore(user, parseInt(data.score) + previousScore, 'Monthly',  (err, result) => {
                if (err) return callback(err);
                if (result && result.rankedAt >= 0) {
                    rankedAt = result.rankedAt;
                }
            })
        });

        // Log score to yearly board
        yearlyBoard.getScoreboard((error, scoreboard) => {
            let sb = []
            if (error) return callback(error);
            if (scoreboard.topScores.length > 0) {
                sb = scoreboard.topScores;
            }
            let previousScore = this._getUserPreviousScore(user._id, sb)
            yearlyBoard.logScore(user, parseInt(data.score) + previousScore, 'Yearly', (err, result) => {
                if (err) return callback(err);
                // Trigger analytics event
                buildfire.analytics.trackAction(analyticKeys.SCORE_LOGGED.key);
                if (result && result.rankedAt >= 0) {
                    return callback(null, { rank: result.rankedAt, board: Keys.overall })
                }

                else {
                    return callback(null, { rank: rankedAt, board: Keys.overall })
                }
            })
        });
    }

    /**
    * Edits user's daily score and applies changes to all boards
    * @param {Object} data object containing settings and new score
    * @param {Function} callback callback for handling response
    */
    static editDailyScore = (data, callback) => {
        let userLastDailyScore = 0;
        if (!authManager.currentUser) return callback("User not logged in");
        let user = authManager.currentUser;

        //Check for errors in settings
        if (typeof data.settings == 'undefined') return callback("Settings is undefined")
        if (data.settings.isSubscribedToPN === null) return callback("isSubscribedToPN is null")
        if (data.settings.isSubscribedToPN === "") return callback("isSubscribedToPN is empty")

        //Check for errors in score
        if (typeof data.score == 'undefined') return callback("Score cannot be undefined")
        if (data.score == null) return callback("Score cannot be null")
        if (data.score !== data.score) return callback("Score cannot be NaN")
        if (typeof data.score !== 'number') return callback("Score must be a number")
        if (data.score < 0) return callback("Score cannot be negative")
        if (data.score == 0) return callback("Score cannot be 0")

        // Get each scoreboard tag
        let date = this.getStandardDate(new Date(), "America/Los_Angeles")
        let dailyTag = this.getDailyTag(date)
        let weeklyTag = this.getWeeklyTag(date)
        let monthlyTag = this.getMonthlyTag(date)
        let yearlyTag = this.getYearlyTag(date)

        // Get the boards using their tags
        // TODO make the size config
        let dailyBoard = new buildfire.gamify.Scoreboard(dailyTag, 100, {
            autoSubscribeToPushNotification: data.settings.isSubscribedToPN
            , overrideRecords: true
            , sortAscending: false
        });

        let weeklyBoard = new buildfire.gamify.Scoreboard(weeklyTag, 100, {
            autoSubscribeToPushNotification: data.settings.isSubscribedToPN
            , overrideRecords: true
            , sortAscending: false
        });

        let monthlyBoard = new buildfire.gamify.Scoreboard(monthlyTag, 100, {
            autoSubscribeToPushNotification: data.settings.isSubscribedToPN
            , overrideRecords: true
            , sortAscending: false
        });

        let yearlyBoard = new buildfire.gamify.Scoreboard(yearlyTag, 100, {
            autoSubscribeToPushNotification: data.settings.isSubscribedToPN
            , overrideRecords: true
            , sortAscending: false
        });

        // Get user's last daily score
        dailyBoard.getScoreboard((error, scoreboard) => {
            userLastDailyScore = this._getUserPreviousScore(user._id, scoreboard.topScores)
            // Apply changes to rest of boards
            dailyBoard.logScore(user, parseInt(data.score), 'Daily', (err, result) => {
                if (err) return callback(err);
                // Edit weekly board
                weeklyBoard.getScoreboard((error, scoreboard) => {
                    let sb = []
                    if (error) return callback(error);
                    if (scoreboard.topScores.length > 0) {
                        sb = scoreboard.topScores;
                    }
                    let weeklyPreviousScore = this._getUserPreviousScore(user._id, sb)
                    weeklyBoard.logScore(user, weeklyPreviousScore - parseInt(userLastDailyScore) + parseInt(data.score), 'Weekly', (err, result) => {
                        if (err) return callback(err);
                        // Edit monthly board
                        monthlyBoard.getScoreboard((error, scoreboard) => {
                            let sb = []
                            if (error) return callback(error);
                            if (scoreboard.topScores.length > 0) {
                                sb = scoreboard.topScores;
                            }
                            let monthlyPreviousScore = this._getUserPreviousScore(user._id, sb)
                            monthlyBoard.logScore(user, monthlyPreviousScore - parseInt(userLastDailyScore) + parseInt(data.score), 'Monthly', (err, result) => {
                                if (err) return callback(err);
                                //Edit yearly board
                                yearlyBoard.getScoreboard((error, scoreboard) => {
                                    let sb = []
                                    if (error) return callback(error);
                                    if (scoreboard.topScores.length > 0) {
                                        sb = scoreboard.topScores;
                                    }
                                    let yearlyPreviousScore = this._getUserPreviousScore(user._id, sb)
                                    yearlyBoard.logScore(user, yearlyPreviousScore - parseInt(userLastDailyScore) + parseInt(data.score), 'Yearly', (err, result) => {
                                        if (err) return callback(err);
                                        return callback(null, "Success")
                                    })
                                });
                            })
                        });
                    })
                });
            })
        });
    }

    /**
    * Resets the data on all boards
    * @param {Function} callback callback for handling response
    */
    static reset = (settings, callback) => {
        // Get each scoreboard tag
        let date = this.getStandardDate(new Date(), "America/Los_Angeles");
        let dailyTag = this.getDailyTag(date);
        let weeklyTag = this.getWeeklyTag(date);
        let monthlyTag = this.getMonthlyTag(date);
        let yearlyTag = this.getYearlyTag(date);

        // Get the boards using their tags
        let dailyBoard = new buildfire.gamify.Scoreboard(dailyTag, 100, {
            autoSubscribeToPushNotification: settings.isSubscribedToPN
            , overrideRecords: true
            , sortAscending: false
        });

        let weeklyBoard = new buildfire.gamify.Scoreboard(weeklyTag, 100, {
            autoSubscribeToPushNotification: settings.isSubscribedToPN
            , overrideRecords: true
            , sortAscending: false
        });

        let monthlyBoard = new buildfire.gamify.Scoreboard(monthlyTag, 100, {
            autoSubscribeToPushNotification: settings.isSubscribedToPN
            , overrideRecords: true
            , sortAscending: false
        });

        let yearlyBoard = new buildfire.gamify.Scoreboard(yearlyTag, 100, {
            autoSubscribeToPushNotification: settings.isSubscribedToPN
            , overrideRecords: true
            , sortAscending: false
        });

        // Reset daily board

        dailyBoard.reset((error, result) => {
            if (error) return callback("Error Resetting the boards")
            // Reset weekly board
            console.log("Reset daily board")
            weeklyBoard.reset((error, result) => {
                if (error) return callback("Error Resetting the boards");
                console.log("Reset weekly board")
                // Reset monthly board
                monthlyBoard.reset((error, result) => {
                    if (error) return callback("Error Resetting the boards");
                    console.log("Reset monthly board")
                    // Reset yearly board
                    yearlyBoard.reset((error, result) => {
                        if (error) return callback("Error Resetting the boards");
                        console.log("Reset yearly board")
                        return callback(null, "Successfully reset all boards");
                    })
                })

            })
        })
    }
}
