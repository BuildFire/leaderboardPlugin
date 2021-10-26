var isSubscribedToPN = true;
var user = {
    displayName: "",
    displayImage: "",
};


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

let strings;

let shownScores = [];
let currentActiveTab = Keys.overall;
let overallScores = [];
let currentSize = 'small';

buildfire.appearance.titlebar.show(null, (err) => { });


//SWIPE INITIALIZATION
let swipeIndicator = document.getElementById("swipeIndicator");
const swipe = new Swipe(swipeIndicator, {
    corners: false,
    minDistance: 5
});

let afterEvent = swipe.addEventListener("after", direction => {
    if (direction === "up") {
        enlargeBoard();
    }

    else if (direction == "down") {
        minfifyBoard();
    }
});

let leaderboardDrawer = document.getElementById("leaderboardDrawer");


swipeIndicator.addEventListener('touchstart', handleTouchStart, false);
swipeIndicator.addEventListener('touchmove', handleTouchMove, false);

if (currentSize == 'small') {
    drawerScoresContainer.addEventListener('touchstart', handleTouchStart, false);
    drawerScoresContainer.addEventListener('touchmove', handleTouchMove, false);
}

var xDown = null;
var yDown = null;

function getTouches(evt) {
    return evt.touches ||             // browser API
        evt.originalEvent.touches; // jQuery
}

function handleTouchStart(evt) {
    const firstTouch = getTouches(evt)[0];
    xDown = firstTouch.clientX;
    yDown = firstTouch.clientY;
};

function handleTouchMove(evt) {
    if (!xDown || !yDown) {
        return;
    }

    var xUp = evt.touches[0].clientX;
    var yUp = evt.touches[0].clientY;

    var xDiff = xDown - xUp;
    var yDiff = yDown - yUp;

    if (Math.abs(xDiff) > Math.abs(yDiff)) {/*most significant*/
        if (xDiff > 0) {
            /* right swipe */
        } else {
            /* left swipe */
        }
    } else {
        if (yDiff > 0) {
            enlargeBoard();
        } else {
            minfifyBoard();
        }
    }
    /* reset values */
    xDown = null;
    yDown = null;
};


function handleTouchMoveScores(evt) {
    if (!xDown || !yDown) {
        return;
    }

    var xUp = evt.touches[0].clientX;
    var yUp = evt.touches[0].clientY;

    var xDiff = xDown - xUp;
    var yDiff = yDown - yUp;

    if (Math.abs(xDiff) > Math.abs(yDiff)) {/*most significant*/
        if (xDiff > 0) {
            /* right swipe */
        } else {
            /* left swipe */
        }
    } else {
        if (yDiff > 0) {
            enlargeBoard();
        } else {
            /* down swipe */
        }
    }
    /* reset values */
    xDown = null;
    yDown = null;
};


///create new instance of buildfire carousel viewer
var view = new buildfire.components.carousel.view("#carousel", []);
const addScoreDialog = new mdc.dialog.MDCDialog(document.getElementById('add_score_dialog'));
const editScoreDialog = new mdc.dialog.MDCDialog(document.getElementById('edit_score_dialog'));

/// load items for carousel view
function loadItems(carouselItems) {
    // create an instance and pass it the items if you don't have items yet just pass []
    view.loadItems(carouselItems);
}



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

    else if (obj.data && obj.data.carouselItems) {
        loadItems(obj.data.carouselItems)
    }
});

buildfire.messaging.onReceivedMessage = (message) => {
    if (message === "Reset") {
        overallScores = [];
        if (!leaderboardDrawer.classList.contains("hide")) leaderboardDrawer.classList.add("hide");
    }
    else {
        if (message.cmd && message.cmd == "refresh") {
            loadLanguage("en-us")
        }
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
        addScoreErrorMessage.innerHTML = "This field is required";
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
        editScoreErrorMessage.innerHTML = "This field is required";
        return false;
    }
};

//add score for current user
const addScore = () => {
    if (checkAddScore()) {
        addScoreButton.classList.add("disabled");
        addScoreButton.disabled = true;
        let score = parseInt(addScoreInput.value);
        Scores.addScore({ score: score, settings: { isSubscribedToPN: isSubscribedToPN } }, (err, data) => {
            if (err == 'User not logged in') {
                authManager.enforceLogin();
            }
            else if (err) {
                console.error(err);
                addScoreLabel.classList.add("error");
                addScoreErrorMessage.classList.add("show");
                addScoreButton.classList.remove("disabled");
                addScoreButton.disabled = false;
                addScoreErrorMessage.innerHTML = "Please input a valid score";
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
                addScoreErrorMessage.innerHTML = "";
                addScoreInput.value = "";
            }
        });
    }
}

//Edit the score of the user
const editScore = () => {
    editScoreButton.classList.add("disabled");
    editScoreButton.disabled = true;
    if (checkEditScore()) {
        let score = parseInt(editScoreInput.value);
        Scores.editDailyScore({ score: score, settings: { isSubscribedToPN: isSubscribedToPN } }, (err, data) => {
            if (err == 'User not logged in') {
                authManager.enforceLogin();
            }
            else if (err) {
                console.error(err);
                editScoreLabel.classList.add("error");
                editScoreErrorMessage.classList.add("show");
                editScoreErrorMessage.innerHTML = "Please input a valid score";
                editScoreButton.classList.remove("disabled");
                editScoreButton.disabled = false;
                return;
            }
            if (data) {
                editScoreDialog.close();
                displayScores();
                editScoreButton.classList.remove("disabled");
                editScoreButton.disabled = false;
                if (editScoreLabel.classList.contains("error")) editScoreLabel.classList.remove("error");
                if (editScoreErrorMessage.classList.contains("show")) editScoreErrorMessage.classList.remove("show");
                editScoreErrorMessage.innerHTML = "";
                editScoreInput.value = "";
            }
        });
    }
}


//easily create a ui element
const ui = (elementType, appendTo, innerHTML, classNameArray, imageSource) => {
    let e = document.createElement(elementType);
    if (innerHTML) e.innerHTML = innerHTML;
    if (elementType == 'img') e.src = imageSource;
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
                else
                    if (!leaderboardDrawer.classList.contains("hide")) leaderboardDrawer.classList.add("hide");
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
        case 'Overall':
            // Render User rank toast
            if (authManager.currentUser) {
                Scores.getCurrentUserRank(Keys.overall, (err, res) => {
                    if (err) {
                        console.error(err);
                    }
                    if (!err) {
                        currentActiveTab = Keys.overall;
                        displayScores();
                        renderUserRankToast(res.rank);
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
        case 'Day':
            if (authManager.currentUser) {
                Scores.getCurrentUserRank(Keys.daily, (err, res) => {
                    if (err) {
                        console.error(err);
                    }
                    if (!err) {
                        currentActiveTab = Keys.daily;
                        displayScores();
                        renderUserRankToast(res.rank, true);
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
        case 'Month':
            if (authManager.currentUser) {
                Scores.getCurrentUserRank(Keys.monthly, (err, res) => {
                    if (!err) {
                        currentActiveTab = Keys.monthly;
                        displayScores();
                        renderUserRankToast(res.rank);
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
        case 'Week':
            if (authManager.currentUser) {
                Scores.getCurrentUserRank(Keys.weekly, (err, res) => {
                    if (!err) {
                        currentActiveTab = Keys.weekly;
                        displayScores();
                        renderUserRankToast(res.rank);
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
const renderUserRankToast = (rank, canEdit) => {
    if (rank > -1) {
        snackbarLabel.innerHTML = `You are ranked #${rank}`;
        if (canEdit) {
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
        image = ui('img', imageContainer, null, ['score-image', 'first'], score.displayPictureUrl);
    }
    else if (index == 1) {
        row = ui('div', drawerScoresContainer, null, ['score-row', 'second'], null);
        leftContainer = ui('div', row, null, ['score-row-left'], null);
        rankContainer = ui('div', leftContainer, null, ['rank-container'], null);
        rank = ui('img', rankContainer, null, ['score-icon'], "./images/number-two.svg");
        imageContainer = ui('div', leftContainer, null, ['score-image-container'], null);
        image = ui('img', imageContainer, null, ['score-image', 'second'], score.displayPictureUrl);
    }
    else if (index == 2) {
        row = ui('div', drawerScoresContainer, null, ['score-row', 'third'], null);
        leftContainer = ui('div', row, null, ['score-row-left'], null);
        rankContainer = ui('div', leftContainer, null, ['rank-container'], null);
        rank = ui('img', rankContainer, null, ['score-icon'], "./images/number-three.svg");
        imageContainer = ui('div', leftContainer, null, ['score-image-container'], null);
        image = ui('img', imageContainer, null, ['score-image', 'third'], score.displayPictureUrl);
    }
    else {
        row = ui('div', drawerScoresContainer, null, ['score-row'], null);
        leftContainer = ui('div', row, null, ['score-row-left'], null);
        rankContainer = ui('div', leftContainer, null, ['rank-container'], null);
        rank = ui('h5', rankContainer, "#" + (index + 1), ['score-rank']);
        imageContainer = ui('div', leftContainer, null, ['score-image-container'], null);
        image = ui('img', imageContainer, null, ['score-image'], score.displayPictureUrl);
    }
    let scoreDiv = ui('div', row, null, ['score-scoreDiv']);
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
        image = ui('img', imageContainer, null, ['score-image', 'first'], score.displayPictureUrl);
    }
    else if (index == 1) {
        row = ui('div', drawerScoresContainer, null, ['score-row', 'second'], null);
        leftContainer = ui('div', row, null, ['score-row-left'], null);
        rank = ui('img', leftContainer, null, ['score-icon'], "./images/number-two.svg");
        imageContainer = ui('div', leftContainer, null, ['score-image-container'], null);
        image = ui('img', imageContainer, null, ['score-image', 'second'], score.displayPictureUrl);
    }
    else if (index == 2) {
        row = ui('div', drawerScoresContainer, null, ['score-row', 'third'], null);
        leftContainer = ui('div', row, null, ['score-row-left'], null);
        rank = ui('img', leftContainer, null, ['score-icon'], "./images/number-three.svg");
        imageContainer = ui('div', leftContainer, null, ['score-image-container'], null);
        image = ui('img', imageContainer, null, ['score-image', 'third'], score.displayPictureUrl);
    }
    else {
        row = ui('div', drawerScoresContainer, null, ['score-row'], null);
        leftContainer = ui('div', row, null, ['score-row-left'], null);
        rank = ui('h5', leftContainer, "#" + (index + 1), ['score-rank']);
        imageContainer = ui('div', leftContainer, null, ['score-image-container'], null);
        image = ui('img', imageContainer, null, ['score-image'], score.displayPictureUrl);
    }
    let scoreDiv = ui('div', row, null, ['score-scoreDiv']);
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
    let scoreDiv = ui('div', row, null, ['score-scoreDiv']);
    let name = ui('div', scoreDiv, null, ['loading-score-name']);
    let scoreP = ui('p', scoreDiv, null, ['loading-score-score']);
}

const renderLoading = () => {
    for (let index = 0; index < 100; index++) {
        renderLoadingRow();
    }
    if (leaderboardDrawer.classList.contains("hide")) leaderboardDrawer.classList.remove("hide");
    if (currentSize === 'large') drawerScoresContainer.classList.add("big");
    if (currentSize === 'small' && drawerScoresContainer.classList.contains("big")) drawerScoresContainer.classList.remove("big");
}

// increase size and render again
const enlargeBoard = () => {
    currentSize = 'large';
    renderLeaderboard(shownScores);
    drawerScoresContainer.removeEventListener('touchstart', handleTouchStart, false);
    drawerScoresContainer.removeEventListener('touchmove', handleTouchMove, false);
}

// decrease size and render again
const minfifyBoard = () => {
    drawerScoresContainer.scrollTop = 0;
    currentSize = 'small';
    renderLeaderboard(shownScores);
    drawerScoresContainer.addEventListener('touchstart', handleTouchStart, false);
    drawerScoresContainer.addEventListener('touchmove', handleTouchMove, false);
}

//Toggle the view where the user adds the score
const showAddScoreView = () => {
    if (authManager.currentUser) {
        user = authManager.currentUser;
        leaderboardDrawer.classList.add("hide");
        addScoreDialog.open();
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
        console.log("scores", scores)
        cb(scores);
    })
}

const closeAddDialog = () => {
    addScoreDialog.close();
    addScoreButton.classList.remove("disabled");
    addScoreButton.disabled = false;
    addScoreInput.value = "";
}

const closeEditDialog = () => {
    editScoreDialog.close();
    editScoreButton.classList.remove("disabled");
    editScoreButton.disabled = false;
    editScoreInput.value = "";
}

//get previous user settings
const load = () => {
    loadLanguage("en-us");
    getScores(Keys.overall, (scores) => {
        if (scores) {
            authManager.getCurrentUser();
            switchTab("Overall");
        }
        else
            leaderboardDrawer.classList.add("hide");
    })

}

const loadLanguage = (lang) => {
    strings = new buildfire.services.Strings(lang, stringsConfig);
    strings.init().then(() => {
        strings.inject();
        inject();
    });
}


const inject = () => {
    document.getElementById("add-dialog-title").innerHTML = strings.get('score.add')
    document.getElementById("add-dialog-subtitle").innerHTML = strings.get('score.addSubtitle')
    document.getElementById("edit-dialog-title").innerHTML = strings.get('score.edit')
    document.getElementById("edit-dialog-subtitle").innerHTML = strings.get('score.editSubtitle')
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
    leaderboardDrawer.classList.remove("hide");
});

editScoreDialog.listen('MDCDialog:opened', function () {
    // Assuming contentElement references a common parent element with the rest of the page's content
    contentElement.setAttribute('aria-hidden', 'true');
});

editScoreDialog.listen('MDCDialog:closing', function (event) {
    contentElement.removeAttribute('aria-hidden');
    leaderboardDrawer.classList.remove("hide");
});


