describe('Scores()', function () {

    /******************************************/
    /*************** Add Score *****************/
    /****************************************/

    describe('addScore()', function () {
        beforeEach(function (done) {
            setTimeout(function () {
                authManager.enforceLogin();
                done();
            }, 100);
        });

        //Definition
        it('addScore function should be defined', function () {
            expect(Scores.getScores).toBeDefined('addScore functionality not defined');
        });

        //Add score with proper parameters(with sub to PN)
        it('Add score with sub to PN', function (done) {
            Scores.addScore({
                score: 100,
                settings: {
                    isSubscribedToPN: true
                }
            }, (err, resp) => {
                expect(resp).toEqual(jasmine.objectContaining({
                    rank: 0,
                }));
                done();
            });
        });

        //Add score with proper parameters(without sub to PN)
        it('Add score without sub to PN', function (done) {
            Scores.addScore({
                score: 100,
                settings: {
                    isSubscribedToPN: false
                }
            }, (err, resp) => {
                expect(resp).toEqual(jasmine.objectContaining({
                    rank: 0,
                }));
                done();
            });
        });

        //Add score with no settings
        it('Add score with no settings', function (done) {
            Scores.addScore({
                score: 100,
            }, (err, resp) => {
                expect(err).toEqual('Settings is undefined');
                done();
            });
        });

        //Add negative score
        it('Add score that is not a number', function (done) {
            Scores.addScore({
                score: '123',
                settings: {
                    isSubscribedToPN: false
                }
            }, (err, resp) => {
                expect(err).toEqual('Score must be a number');
                done();
            });
        });

        //Add negative score
        it('Add negative score', function (done) {
            Scores.addScore({
                score: -1,
                settings: {
                    isSubscribedToPN: false
                }
            }, (err, resp) => {
                expect(err).toEqual('Score cannot be negative');
                done();
            });
        });

        //Add score equal to 0
        it('Add 0 score', function (done) {
            Scores.addScore({
                score: 0,
                settings: {
                    isSubscribedToPN: false
                }
            }, (err, resp) => {
                expect(err).toEqual('Score cannot be 0');
                done();
            });
        });

        // //Add score equal to null
        it('Add null score', function (done) {
            Scores.addScore({
                score: null,
                settings: {
                    isSubscribedToPN: false
                }
            }, (err, resp) => {
                expect(err).toEqual('Score cannot be null');
                done();
            });
        });

        //Add score equal to undefined
        it('Add undefined score', function (done) {
            var x = undefined;
            Scores.addScore({
                score: x,
                settings: {
                    isSubscribedToPN: false
                }
            }, (err, resp) => {
                expect(err).toEqual('Score cannot be undefined');
                done();
            });
        });

        //Add score equal to NaN
        it('Add NaN score', function (done) {
            Scores.addScore({
                score: NaN,
                settings: {
                    isSubscribedToPN: false
                }
            }, (err, resp) => {
                expect(err).toEqual('Score cannot be NaN');
                done();
            });
        });
    });



    /******************************************/
    /************** Get Scores *****************/
    /****************************************/
    describe('getScores()', function () {
        beforeEach(function (done) {
            setTimeout(function () {
                authManager.enforceLogin();
                done();
            }, 100);
        });

        it('getScores function should be defined', function () {
            expect(Scores.getScores).toBeDefined('getScores functionality not defined');
        });

        it('Get scores of daily leaderboard', function (done) {
            Scores.getScores({
                leaderboardType: 'daily',
                settings: {
                    isSubscribedToPN: true
                }
            },
                (err, res) => {
                    expect(res).toEqual(jasmine.objectContaining([]));
                    done();
                });

        })

        it('Get scores of weekly leaderboard', function (done) {
            Scores.getScores({
                leaderboardType: 'weekly',
                settings: {
                    isSubscribedToPN: true
                }
            },
                (err, res) => {
                    expect(res).toEqual(jasmine.objectContaining([]));
                    done();
                });
        })

        it('Get scores of monthly leaderboard', function (done) {
            Scores.getScores({
                leaderboardType: 'monthly',
                settings: {
                    isSubscribedToPN: true
                }
            },
                (err, res) => {
                    expect(res).toEqual(jasmine.objectContaining([]));
                    done();
                });

        })

        it('Get scores of yearly leaderboard', function (done) {
            Scores.getScores({
                leaderboardType: 'yearly',
                settings: {
                    isSubscribedToPN: true
                }
            },
                (err, res) => {
                    expect(res).toEqual(jasmine.objectContaining([]));
                    done();
                });

        })
    });

    /******************************************/
    /************** Reset Scores *****************/
    /****************************************/
    describe('reset()', function () {
        beforeEach(function (done) {
            setTimeout(function () {
                authManager.enforceLogin();
                done();
            }, 100);
        })

        it('reset function should be defined', function (done) {
            expect(Scores.reset).toBeDefined('reset functionality not defined');
            done();
        })

        it('Reset all boards', function (done) {
            Scores.reset({
                isSubscribedToPN: true
            }
                , (err, res) => {
                    expect(res).toEqual('Successfully reset all boards');
                    done();
                });
        })
    });
});