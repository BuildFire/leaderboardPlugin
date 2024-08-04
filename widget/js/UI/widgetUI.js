var isSubscribedToPN = true;
var user = {
    displayName: "",
    displayImage: "",
};

var isCalculatingPoints = false

let testData = [
    {
        "createdOn": "2021-10-16T10:02:52.128Z",
        "userId": "6132739cfe743405301f54cd",
        "displayName": "Mohamad",
        "currentScore": 300,
        "displayPictureUrl": "https://picsum.photos/100/100",
        "_buildfire": {},
        "isActive": true,
        "lastUpdatedOn": "2021-10-08T20:30:47.987Z"
    },
    {
        "createdOn": "2021-10-15T20:39:35.951Z",
        "userId": "612fb40ffe743405301f4367",
        "displayName": "Josh",
        "currentScore": 110,
        "displayPictureUrl": "https://picsum.photos/100/100",
        "_buildfire": {},
        "isActive": true,
        "lastUpdatedOn": "2021-09-01T17:10:39.799Z"
    },
    {
        "createdOn": "2021-10-16T10:02:52.128Z",
        "userId": "6132739cfe743405301f54cd",
        "displayName": "Julie",
        "currentScore": 48,
        "displayPictureUrl": "https://picsum.photos/100/100",
        "_buildfire": {},
        "isActive": true,
        "lastUpdatedOn": "2021-10-08T20:30:47.987Z"
    },
    {
        "createdOn": "2021-10-16T10:02:52.128Z",
        "userId": "6132739cfe743405301f54cd",
        "displayName": "Tim",
        "currentScore": 48,
        "displayPictureUrl": "https://picsum.photos/100/100",
        "_buildfire": {},
        "isActive": true,
        "lastUpdatedOn": "2021-10-08T20:30:47.987Z"
    },
    {
        "createdOn": "2021-10-16T10:02:52.128Z",
        "userId": "6132739cfe743405301f54cd",
        "displayName": "Karl",
        "currentScore": 25,
        "displayPictureUrl": "https://picsum.photos/100/100",
        "_buildfire": {},
        "isActive": true,
        "lastUpdatedOn": "2021-10-08T20:30:47.987Z"
    },
    {
        "createdOn": "2021-10-16T10:02:52.128Z",
        "userId": "6132739cfe743405301f54cd",
        "displayName": "Tom",
        "currentScore": 50,
        "displayPictureUrl": "https://picsum.photos/100/100",
        "_buildfire": {},
        "isActive": true,
        "lastUpdatedOn": "2021-10-08T20:30:47.987Z"
    },
    {
        "createdOn": "2021-10-16T10:02:52.128Z",
        "userId": "6132739cfe743405301f54cd",
        "displayName": "Tommy",
        "currentScore": 84,
        "displayPictureUrl": "https://picsum.photos/100/100",
        "_buildfire": {},
        "isActive": true,
        "lastUpdatedOn": "2021-10-08T20:30:47.987Z"
    },
    {
        "createdOn": "2021-10-16T10:02:52.128Z",
        "userId": "6132739cfe743405301f54cd",
        "displayName": "Test1",
        "currentScore": 55,
        "displayPictureUrl": "https://picsum.photos/100/100",
        "_buildfire": {},
        "isActive": true,
        "lastUpdatedOn": "2021-10-08T20:30:47.987Z"
    },
    {
        "createdOn": "2021-10-16T10:02:52.128Z",
        "userId": "6132739cfe743405301f54cd",
        "displayName": "Tomm",
        "currentScore": 97,
        "displayPictureUrl": "https://picsum.photos/100/100",
        "_buildfire": {},
        "isActive": true,
        "lastUpdatedOn": "2021-10-08T20:30:47.987Z"
    },
];

let settings = null;

let shownScores = [];
let currentActiveTab = Keys.overall;
let overallScores = [];
let currentSize = 'small';

buildfire.appearance.titlebar.show(null, (err) => { });


///create new instance of buildfire carousel viewer
var view = new buildfire.components.carousel.view("#carousel", []);
const addScoreDialog = new mdc.dialog.MDCDialog(document.getElementById('add_score_dialog'));
const editScoreDialog = new mdc.dialog.MDCDialog(document.getElementById('edit_score_dialog'));

/// load items for carousel view
function loadItems(carouselItems) {
    // create an instance and pass it the items if you don't have items yet just pass []
    view.loadItems(carouselItems);
}

buildfire.datastore.get("Settings",(err, result)=>{
    if(err) return;
    settings = result.data;
    if(settings.calculateLoyaltyPoints && settings.calculateLoyaltyPoints == true){
        calculateLoyaltyPoints();
    } else if(settings && settings.userEarnPoints == "SCORE_FROM_FREE_TEXT_QUESTIONNAIRE"){
        calculateFtqPoints();
    }
   
})

/// call buildfire datastore to see if there are any previously saved items
buildfire.datastore.get(function (err, obj) {
    if (err)
        alert('error');
    else {
        loadItems(obj.data.carouselItems)
    }

});

buildfire.datastore.get("wysContent", (err, res) => {
    if (err)
        console.error(err)
    else {
        if (res && res.data) {
            loadData(null, res)
        }
    }
});

buildfire.datastore.onUpdate(function (obj) {

    if (obj.tag == "wysContent") {
        loadData(null, obj)
    }
    else if(obj.tag == "Settings"){
        settings = obj.data
    }
    else if (obj.data && obj.data.carouselItems) {
        loadItems(obj.data.carouselItems)
    }
});

buildfire.messaging.onReceivedMessage = (message) => {
    if (message === "Reset") {
        overallScores = [];
        if (!leaderboardDrawer.classList.contains("hide")) leaderboardDrawer.classList.add("hide");
        contentContainer.classList.remove("small");
    }
};

//load data into wys
function loadData(callback, obj) {
    if (obj && obj.data.content) {
        document.getElementById('my_container_div').innerHTML = obj.data.content;
    }
}

// check if user entered the score
const checkAddScore = () => {
    let s = addScoreInput.value;
    if (s != "") {
        return true;
    }
    else {
        addScoreLabel.classList.add("error");
        addScoreErrorMessage.classList.add("show");
        return false;
    }
};

// check if user entered the score
const checkEditScore = () => {
    let s = editScoreInput.value;
    if (s != "") {
        return true;
    }
    else {
        editScoreLabel.classList.add("error");
        editScoreErrorMessage.classList.add("show");
        return false;
    }
};

//add score for current user
const addScore = () => {
    if (checkAddScore()) {
        settings.isSubscribedToPN = isSubscribedToPN

        addScoreButton.classList.add("disabled");
        addScoreButton.disabled = true;
        let score = parseInt(addScoreInput.value);
        Scores.addScore({ score: score, settings }, (err, data) => {
            if (err == 'User not logged in') {
                authManager.enforceLogin();
            }
            else if (err) {
                console.error(err);
                addScoreLabel.classList.add("error");
                addScoreErrorMessage.classList.add("show");
                addScoreButton.classList.remove("disabled");
                addScoreButton.disabled = false;
            }

            if (data) {
                addScoreDialog.close();
                displayScores();
                if (data.rank >= 0) {
                    renderAddScoreToast(data.rank + 1);
                }
                else {
                    renderAddScoreToast(false);
                }
                addScoreButton.classList.remove("disabled");
                addScoreButton.disabled = false;
                if (addScoreLabel.classList.contains("error")) addScoreLabel.classList.remove("error");
                if (addScoreErrorMessage.classList.contains("show")) addScoreErrorMessage.classList.remove("show");
                addScoreInput.value = "";
            }
        });
    }
}

const editScoreFromFTQ = (overal, daily, points, callback) => {
    if(!overal || overal.score == 0){
        editScoreInput.value = points
        editScore(false, callback);
    }
    else if(!daily || daily.score == 0){
        editScoreInput.value = points
        editScore(false, callback);
    }
    else if(overal.score > 0 && overal.score == daily.score){
        editScoreInput.value = points + overal.score
        editScore(false, callback);
    }else if(daily.score > 0){
        editScoreInput.value = points + daily.score
        editScore(false, callback);
    }
}

const editScoreFromLoyalty = (overal, daily, points, callback) => {
    let dailyScore = daily && daily.score ? daily.score : 0 
    const newDailyScore = dailyScore + points
    editScoreInput.value = newDailyScore > 0 ? newDailyScore : 0;
    editScore(true, callback);
}


const editScoreByCalculatingPoint = (points, pointsFrom, callback) => {
    Scores.getCurrentUserRank(Keys.overall, (error, overal) => {
        Scores.getCurrentUserRank(Keys.daily, (err, daily) => {
            if(pointsFrom == "LOYALTY"){
               editScoreFromLoyalty(overal, daily, points, callback)
            } else if(pointsFrom == "FTQ"){
                editScoreFromFTQ(overal, daily, points, callback);
            }
        });
    });
}

const calculateLoyaltyPoints = () => {
    isCalculatingPoints = true;
    buildfire.auth.getCurrentUser(function (err, user) {
        if(user){
            buildfire.appData.search(
                {
                  filter: {
                    "$json.userId": {$eq: user._id},
                    "$and": [
                        {
                            "$json.newPoints": { $gt: 0 }
                        }
                    ]
                  },
                },
                "userLoyaltyPoints",
                (err, result) => {
                    if(result && result[0] && result[0].data){ // user loyalty record is a single record and all not calculated points will be stored in this record
                        const loyaltyNewPoints = result[0].data.newPoints;
                        editScoreByCalculatingPoint(loyaltyNewPoints, "LOYALTY", (err, res) => {
                            if (err) return console.error(err);
                            resetLoyaltyNewPoints(user._id)
                        });
                    }
                 })
        }
    })
}

const resetLoyaltyNewPoints = (userId) => {
    buildfire.appData.searchAndUpdate(
        { userId: { $eq: userId } },
        { $set: { newPoints: 0 } },
        "userLoyaltyPoints",
        (err, result) => {}
        );
}


const calculateFtqPoints = function(){
    if(settings.features && settings.features.length > 0){
        buildfire.auth.getCurrentUser(function (err, user) {
            if(user){
                isCalculatingPoints = true;
                settings.features.forEach(element => {
                    buildfire.appData.search({
                      filter: {
                        "$json.user._id": {$eq: user._id},
                        "$or": [
                            {
                                "$json.isEarnedPoints": {$eq: false}
                            }, {
                                "$json.isEarnedPoints": {$exists: false}
                            }
                        ]
                      },
                      sort:   {"finishedDateTime": -1},
                      skip:   0,
                    },
                    "freeTextQuestionnaireSubmissions_" + element.instanceId,
                    (err, submissions) => { 
                      if(submissions && submissions.length > 0){
                        let score = 0;
                        submissions.forEach(submission => {
                            submission.data.answers.forEach(answer => {
                                score += (answer && answer.score) ? answer.score : 0
                            });
                        })
                        if(score != 0){
                            editScoreByCalculatingPoint(score, "FTQ", (error, res) => {
                                if (error) return console.error(error);

                                buildfire.appData.searchAndUpdate({
                                    "$json.user._id": { $eq: user._id },
                                    "$or": [
                                        {
                                            "$json.isEarnedPoints": { $eq: false }
                                        }, {
                                            "$json.isEarnedPoints": { $exists: false }
                                        }
                                    ]
                                }, {
                                    $set: {
                                        isEarnedPoints: true
                                    }
                                }, "freeTextQuestionnaireSubmissions_" + element.instanceId,
                                (err, res) => {
                                    if (err) console.log(err);
                                });

                            });
                        }
                      }
                    })
                  });
            }
        })
        
    }
       
  }

//Edit the score of the user
const editScore = (allowScoreToBeZero = false, callback) => {
    editScoreButton.classList.add("disabled");
    editScoreButton.disabled = true;
    if (checkEditScore()) {
        let score = parseInt(editScoreInput.value);
        settings.isSubscribedToPN = isSubscribedToPN
        Scores.editDailyScore({ score: score, settings, allowScoreToBeZero}, (err, data) => {
            callback && callback(err, data);
            if (err == 'User not logged in') {
                authManager.enforceLogin();
            }
            else if (err) {
                console.error(err);
                editScoreLabel.classList.add("error");
                editScoreErrorMessage.classList.add("show");
                editScoreButton.classList.remove("disabled");
                editScoreButton.disabled = false;
                return;
            }
            if (data) {
                editScoreDialog.close();
                if(isCalculatingPoints){
                    isCalculatingPoints = false;
                    Scores.getCurrentUserRank(Keys.overall, (err, res) => {
                        if (err && err == "Scoreboard is empty") {
                            console.error(err);
                            if (!leaderboardDrawer.classList.contains("hide")) leaderboardDrawer.classList.add("hide");
                            contentContainer.classList.remove("small");
                        }
                        if (!err) {
                            currentActiveTab = Keys.overall;
                            displayScores();
                            renderUserRankToast(res);
                        }
                    });

                } else {
                    displayScores();
                }
                editScoreButton.classList.remove("disabled");
                editScoreButton.disabled = false;
                if (editScoreLabel.classList.contains("error")) editScoreLabel.classList.remove("error");
                if (editScoreErrorMessage.classList.contains("show")) editScoreErrorMessage.classList.remove("show");
                editScoreInput.value = "";
            }
        });
    }
}


//easily create a ui element
const ui = (elementType, appendTo, innerHTML, classNameArray, imageSource, imageType, rank) => {
    let e = document.createElement(elementType);
    if (innerHTML) e.innerHTML = innerHTML;
    if (elementType == 'img') {
        e.src = imageSource;
        if (imageType == 'profile') {
            let width = 40;
            let height = 40;

            if (rank == 0) {
                width = 80;
                height = 80;
            }

            if (rank == 1) {
                width = 64;
                height = 64;
            }

            if (rank == 2) {
                width = 64;
                height = 64;
            }
            e.onload = () => {
                if (e.src.indexOf('avatar.png') < 0) {
                    e.src = buildfire.imageLib.cropImage(imageSource, { width: height, height: height });
                }
            }
            e.onerror = () => {
                e.src = "./images/avatar.png"
            };
        }
    }
    if (Array.isArray(classNameArray)) {
        classNameArray.forEach(c => e.classList.add(c));
    }
    if (appendTo) appendTo.appendChild(e);
    return e
}

// Fetches the scores of the active tab and passes to renderLeaderboard
const displayScores = () => {
    // Turn on active tab
    switch (currentActiveTab) {
        case Keys.overall:
            getScores(Keys.overall, (scores) => {
                if (scores.length > 0) {
                    overallScores = scores;
                    drawerScoresContainer.innerHTML = ""
                    renderLeaderboard(scores)
                }
                else {
                    if (!leaderboardDrawer.classList.contains("hide")) leaderboardDrawer.classList.add("hide");
                    contentContainer.classList.remove("small");
                }
                    
            });
            break;
        case Keys.daily:
            getScores(Keys.daily, (scores) => {
                if (scores.length > 0) {
                    drawerScoresContainer.innerHTML = ""
                    renderLeaderboard(scores)
                }
                else {
                    drawerScoresContainer.innerHTML = ""
                    renderEmptyLeaderboard();
                }
            });
            break;
        case Keys.monthly:
            getScores(Keys.monthly, (scores) => {
                if (scores.length > 0) {
                    drawerScoresContainer.innerHTML = ""
                    renderLeaderboard(scores)
                }
                else {
                    drawerScoresContainer.innerHTML = ""
                    renderEmptyLeaderboard();
                }
            });
            break;
        case Keys.weekly:
            getScores(Keys.weekly, (scores) => {
                if (scores.length > 0) {
                    drawerScoresContainer.innerHTML = ""
                    renderLeaderboard(scores)
                }
                else {
                    drawerScoresContainer.innerHTML = ""
                    renderEmptyLeaderboard();
                }
            });
            break;
        default:
            break;
    }
}

const switchTab = (activeTab) => {
    // Hide the currently shown toast
    drawerScoresContainer.innerHTML = ""
    hideToast();
    renderLoading();
    // Turn on active tab
    switch (activeTab) {
        case Keys.overall:
            // Render User rank toast
            if (authManager.currentUser) {
                Scores.getCurrentUserRank(Keys.overall, (err, res) => {
                    if (err && err == "Scoreboard is empty") {
                        console.error(err);
                        if (!leaderboardDrawer.classList.contains("hide")) leaderboardDrawer.classList.add("hide");
                        contentContainer.classList.remove("small");
                    }
                    if (!err) {
                        currentActiveTab = Keys.overall;
                        displayScores();
                        if(!isCalculatingPoints){
                            renderUserRankToast(res);
                        }
                    }
                });
            }
            else {
                currentActiveTab = Keys.overall;
                displayScores();

            }
            overallHeader.classList.add('active-header');
            dayHeader.classList.remove('active-header');
            weekHeader.classList.remove('active-header');
            monthHeader.classList.remove('active-header');
            break;
        case Keys.daily:
            if (authManager.currentUser) {
                Scores.getCurrentUserRank(Keys.daily, (err, res) => {
                    if (err) {
                        console.error(err);
                    }
                    if (!err) {
                        currentActiveTab = Keys.daily;
                        displayScores();
                        renderUserRankToast(res, true);
                    }

                    else {
                        currentActiveTab = Keys.daily;
                        displayScores();
                    }
                });
            }
            else {
                currentActiveTab = Keys.daily;
                displayScores();
            }
            dayHeader.classList.add('active-header');
            overallHeader.classList.remove('active-header');
            weekHeader.classList.remove('active-header');
            monthHeader.classList.remove('active-header');
            break;
        case Keys.monthly:
            if (authManager.currentUser) {
                Scores.getCurrentUserRank(Keys.monthly, (err, res) => {
                    if (!err) {
                        currentActiveTab = Keys.monthly;
                        displayScores();
                        renderUserRankToast(res);
                    }

                    else {
                        currentActiveTab = Keys.monthly;
                        displayScores();
                    }
                });
            }
            else {
                currentActiveTab = Keys.monthly;
                displayScores();

            }
            monthHeader.classList.add('active-header');
            dayHeader.classList.remove('active-header');
            weekHeader.classList.remove('active-header');
            overallHeader.classList.remove('active-header');
            break;
        case Keys.weekly:
            if (authManager.currentUser) {
                Scores.getCurrentUserRank(Keys.weekly, (err, res) => {
                    if (!err) {
                        currentActiveTab = Keys.weekly;
                        displayScores();
                        renderUserRankToast(res);
                    }

                    else {
                        currentActiveTab = Keys.weekly;
                        displayScores();
                    }
                });
            }
            else {
                currentActiveTab = Keys.weekly;
                displayScores();

            }
            weekHeader.classList.add('active-header');
            dayHeader.classList.remove('active-header');
            monthHeader.classList.remove('active-header');
            overallHeader.classList.remove('active-header');
            break;
        default:
            break;
    }
}

// render user rank toast
const renderUserRankToast = (result, canEdit) => {
    if (result.rank > -1) {
        snackbarLabel.innerHTML = `You are ranked #${result.rank} with ${result.score} points`;
        if(canEdit && (!settings || (settings.userEarnPoints != "SCORE_FROM_FREE_TEXT_QUESTIONNAIRE"))){
            editScoreContainer.classList.add('show');
        }
    }
    else {
        snackbarLabel.innerHTML = `You are not ranked in top 100`;
    }

    scoreSnackbar.className = "show";
    setTimeout(function () {
        hideToast();
    }, 3000);
}

// render toast after user add score
const renderAddScoreToast = (rankedAt) => {
    snackbarLabel.innerHTML = `Score was successfully added.`;
    if (rankedAt) {
        snackbarLabel.innerHTML = `Score was successfully added. You are ranked #${rankedAt}`;
    }
    scoreSnackbar.className = "show";
    setTimeout(function () { scoreSnackbar.className = scoreSnackbar.className.replace("show", ""); }, 3000);

}

// hide the currently showed toast
const hideToast = () => {
    scoreSnackbar.className = scoreSnackbar.className.replace("show", "");
    editScoreContainer.classList.remove('show');
}

// helper to renderLeaderboard
const renderScoreRow = (score, index) => {
    let row = null;
    let rank = null;
    let leftContainer = null;
    let imageContainer = null;
    let rankContainer = null;
    let image = null;
    if (index == 0) {
        row = ui('div', drawerScoresContainer, null, ['score-row', 'first'], null);
        leftContainer = ui('div', row, null, ['score-row-left'], null);
        rankContainer = ui('div', leftContainer, null, ['rank-container'], null);
        rank = ui('img', rankContainer, null, ['score-icon'], "./images/number-one.svg");
        imageContainer = ui('div', leftContainer, null, ['score-image-container'], null);
        image = ui('img', imageContainer, null, ['score-image', 'first'], score.displayPictureUrl, 'profile', 0);
    }
    else if (index == 1) {
        row = ui('div', drawerScoresContainer, null, ['score-row', 'second'], null);
        leftContainer = ui('div', row, null, ['score-row-left'], null);
        rankContainer = ui('div', leftContainer, null, ['rank-container'], null);
        rank = ui('img', rankContainer, null, ['score-icon'], "./images/number-two.svg");
        imageContainer = ui('div', leftContainer, null, ['score-image-container'], null);
        image = ui('img', imageContainer, null, ['score-image', 'second'], score.displayPictureUrl, 'profile', 1);
    }
    else if (index == 2) {
        row = ui('div', drawerScoresContainer, null, ['score-row', 'third'], null);
        leftContainer = ui('div', row, null, ['score-row-left'], null);
        rankContainer = ui('div', leftContainer, null, ['rank-container'], null);
        rank = ui('img', rankContainer, null, ['score-icon'], "./images/number-three.svg");
        imageContainer = ui('div', leftContainer, null, ['score-image-container'], null);
        image = ui('img', imageContainer, null, ['score-image', 'third'], score.displayPictureUrl, 'profile', 2);
    }
    else {
        row = ui('div', drawerScoresContainer, null, ['score-row'], null);
        leftContainer = ui('div', row, null, ['score-row-left'], null);
        rankContainer = ui('div', leftContainer, null, ['rank-container'], null);
        rank = ui('h5', rankContainer, "#" + (index + 1), ['score-rank']);
        imageContainer = ui('div', leftContainer, null, ['score-image-container'], null);
        image = ui('img', imageContainer, null, ['score-image'], score.displayPictureUrl, 'profile');
    }
    let scoreDiv = ui('div', row, null, ['score-row-right']);
    let name = ui('p', scoreDiv, score.displayName, ['score-name']);
    let scoreP = ui('p', scoreDiv, score.currentScore, ['score-score']);
}

// Render leaderboard
const renderLeaderboard = (scores) => {
    if (scores && scores.length > 0 && scores != shownScores) {
        scores.forEach((score, index) => {
            renderScoreRow(score, index);
        });
        if (leaderboardDrawer.classList.contains("hide")) leaderboardDrawer.classList.remove("hide");
        contentContainer.classList.add("small");
        shownScores = scores;
    }
    if (currentSize === 'large') drawerScoresContainer.classList.add("big");
    if (currentSize === 'small' && drawerScoresContainer.classList.contains("big")) drawerScoresContainer.classList.remove("big")

}

// When we switch to an empty leaderboard we render all overall scores as 0
const renderEmptyLeaderboard = () => {
    overallScores.forEach((score, index) => {
        renderEmptyScoreRow(score, index);
    });
    if (leaderboardDrawer.classList.contains("hide")) leaderboardDrawer.classList.remove("hide");
    contentContainer.classList.add("small");
    shownScores = overallScores;
    if (currentSize === 'large') drawerScoresContainer.classList.add("big");
    if (currentSize === 'small' && drawerScoresContainer.classList.contains("big")) drawerScoresContainer.classList.remove("big")
}

// helper to renderEmptyLeaderboard
const renderEmptyScoreRow = (score, index) => {
    let row = null;
    let rank = null;
    let leftContainer = null;
    let imageContainer = null;
    let image = null;
    if (index == 0) {
        row = ui('div', drawerScoresContainer, null, ['score-row', 'first'], null);
        leftContainer = ui('div', row, null, ['score-row-left'], null);
        rank = ui('img', leftContainer, null, ['score-icon'], "./images/number-one.svg");
        imageContainer = ui('div', leftContainer, null, ['score-image-container'], null);
        image = ui('img', imageContainer, null, ['score-image', 'first'], score.displayPictureUrl, 'profile', 0);
    }
    else if (index == 1) {
        row = ui('div', drawerScoresContainer, null, ['score-row', 'second'], null);
        leftContainer = ui('div', row, null, ['score-row-left'], null);
        rank = ui('img', leftContainer, null, ['score-icon'], "./images/number-two.svg");
        imageContainer = ui('div', leftContainer, null, ['score-image-container'], null);
        image = ui('img', imageContainer, null, ['score-image', 'second'], score.displayPictureUrl, 'profile', 1);
    }
    else if (index == 2) {
        row = ui('div', drawerScoresContainer, null, ['score-row', 'third'], null);
        leftContainer = ui('div', row, null, ['score-row-left'], null);
        rank = ui('img', leftContainer, null, ['score-icon'], "./images/number-three.svg");
        imageContainer = ui('div', leftContainer, null, ['score-image-container'], null);
        image = ui('img', imageContainer, null, ['score-image', 'third'], score.displayPictureUrl, 'profile', 2);
    }
    else {
        row = ui('div', drawerScoresContainer, null, ['score-row'], null);
        leftContainer = ui('div', row, null, ['score-row-left'], null);
        rank = ui('h5', leftContainer, "#" + (index + 1), ['score-rank']);
        imageContainer = ui('div', leftContainer, null, ['score-image-container'], null);
        image = ui('img', imageContainer, null, ['score-image'], score.displayPictureUrl);
    }
    let scoreDiv = ui('div', row, null, ['score-row-right']);
    let name = ui('p', scoreDiv, score.displayName, ['score-name']);
    let scoreP = ui('p', scoreDiv, '0', ['score-score']);
}

// Render loading row
const renderLoadingRow = () => {
    let row = ui('div', drawerScoresContainer, null, ['loading-score-row'], null);
    let leftContainer = ui('div', row, null, ['score-row-left'], null);
    let rank = ui('div', leftContainer, null, ['loading-score-rank'], null);
    let imageContainer = ui('div', leftContainer, null, ['score-image-container'], null);
    let image = ui('div', imageContainer, null, ['loading-score-image'], null);
    let scoreDiv = ui('div', row, null, ['score-row-right']);
    let name = ui('div', scoreDiv, null, ['loading-score-name']);
    let scoreP = ui('p', scoreDiv, null, ['loading-score-score']);
}

const renderLoading = () => {
    for (let index = 0; index < 100; index++) {
        renderLoadingRow();
    }
    if (leaderboardDrawer.classList.contains("hide")) leaderboardDrawer.classList.remove("hide");
    contentContainer.classList.add("small");
    if (currentSize === 'large') drawerScoresContainer.classList.add("big");
    if (currentSize === 'small' && drawerScoresContainer.classList.contains("big")) drawerScoresContainer.classList.remove("big");
}

// increase size and render again
const enlargeBoard = () => {
    currentSize = 'large';
    renderLeaderboard(shownScores);
}

// decrease size and render again
const minfifyBoard = () => {
    drawerScoresContainer.scrollTop = 0;
    currentSize = 'small';
    renderLeaderboard(shownScores);
}

//Toggle the view where the user adds the score
const showAddScoreView = () => {
    if (authManager.currentUser) {
        if(settings != null &&  settings.userEarnPoints && settings.userEarnPoints === "SCORE_FROM_FREE_TEXT_QUESTIONNAIRE"){
            if(settings.features.length == 1){
                buildfire.navigation.navigateTo({
                    instanceId: settings.features[0].instanceId,
                  });
            } else {
                let items = [];
                settings.features.forEach(element => {
                  items.push({
                    text: element.title,
                    instanceId: element.instanceId,
                    iconUrl: element.iconUrl
                  })
                });
                buildfire.components.drawer.open(
                  {
                    listItems: items
                  },
                  (err, result) => {
                    if (err) return console.error(err);
                    buildfire.components.drawer.closeDrawer();
                    buildfire.navigation.navigateTo({
                      instanceId: result.instanceId,
                    });
                  }
                );
            }
        } else {
            user = authManager.currentUser;
            leaderboardDrawer.classList.add("hide");
            contentContainer.classList.remove("small");
            addScoreDialog.open();
        }
    }

    else {
        authManager.enforceLogin();
    }
}

//Toggle the view where the user adds the score
const showEditScoreView = () => {
    if (authManager.currentUser && currentActiveTab == Keys.daily) {
        user = authManager.currentUser;
        leaderboardDrawer.classList.add("hide");
        contentContainer.classList.remove("small");
        editScoreDialog.open();
    }

    else {
        authManager.enforceLogin();
    }
}

//get list of score of a leaderboard
const getScores = (leaderboardType, cb) => {
    Scores.getScores({ leaderboardType: leaderboardType, settings: { isSubscribedToPN: isSubscribedToPN } }, (err, scores) => {
        if (err) console.error(err);
        cb(scores);
    })
}

const closeAddDialog = () => {
    addScoreDialog.close();
    addScoreButton.classList.remove("disabled");
    addScoreButton.disabled = false;
    if (addScoreLabel.classList.contains("error")) addScoreLabel.classList.remove("error");
    if (addScoreErrorMessage.classList.contains("show")) addScoreErrorMessage.classList.remove("show");
    addScoreInput.value = "";
    getScores(Keys.overall, (scores) => {
        if (scores.length != 0) {
            leaderboardDrawer.classList.remove("hide");
            contentContainer.classList.add("small");
        }
    })
}

const closeEditDialog = () => {
    editScoreDialog.close();
    editScoreButton.classList.remove("disabled");
    editScoreButton.disabled = false;
    if (editScoreLabel.classList.contains("error")) editScoreLabel.classList.remove("error");
    if (editScoreErrorMessage.classList.contains("show")) editScoreErrorMessage.classList.remove("show");
    editScoreInput.value = "";
    getScores(Keys.overall, (scores) => {
        if (scores.length != 0) {
            leaderboardDrawer.classList.remove("hide");
            contentContainer.classList.add("small");
        }
    })
}

const testScores = () => {
    let testData = [];
    for (let index = 0; index <= 100; index++) {
        testData.push(
            {
                "createdOn": "2021-10-16T10:02:52.128Z",
                "userId": "6132739cfe743405301f54cd",
                "displayName": "Mohamad",
                "currentScore": 300,
                "displayPictureUrl": "https://picsum.photos/100/100",
                "_buildfire": {},
                "isActive": true,
                "lastUpdatedOn": "2021-10-08T20:30:47.987Z"
            })
    }
    renderLeaderboard(testData);
}

//get previous user settings
const load = () => {
    authManager.getCurrentUser();
    getScores(Keys.overall, (scores) => {
        if (scores && scores.length > 0) {
            switchTab(Keys.overall);
            // testScores();
        }
        else {
            leaderboardDrawer.classList.add("hide");
            contentContainer.classList.remove("small");
        }

    })

}



load();

buildfire.auth.onLogin((user) => {
    authManager.currentUser = user;
    load();
});

buildfire.auth.onLogout(() => {
    authManager.currentUser = null;
    load();
});


addScoreDialog.listen('MDCDialog:opened', function () {
    // Assuming contentElement references a common parent element with the rest of the page's content
    contentElement.setAttribute('aria-hidden', 'true');
});

addScoreDialog.listen('MDCDialog:closing', function (event) {
    contentElement.removeAttribute('aria-hidden');
});

editScoreDialog.listen('MDCDialog:opened', function () {
    // Assuming contentElement references a common parent element with the rest of the page's content
    contentElement.setAttribute('aria-hidden', 'true');
});

editScoreDialog.listen('MDCDialog:closing', function (event) {
    contentElement.removeAttribute('aria-hidden');
});