var isSubscribedToPN = true;
var user = {
    displayName: "",
    displayImage: "",
};

let overallScores = [];
let monthlyScores = [];
let weeklyScores = [];
let dailyScores = [];


///create new instance of buildfire carousel viewer
var view = new buildfire.components.carousel.view("#carousel", []);
const dialog = new mdc.dialog.MDCDialog(document.querySelector('.mdc-dialog'));
const textField = new mdc.textField.MDCTextField(document.querySelector('.mdc-text-field'));



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

buildfire.datastore.onUpdate(function (obj) {
    if (obj.tag == "wysContent") {
        loadData(null, obj)
    }

    else {
        loadItems(obj.data.carouselItems);
    }
});

//load data into wys
function loadData(callback, obj) {
    if (obj && obj.data.content) {
        document.getElementById('my_container_div').innerHTML = obj.data.content;
    }
}

//add score for current user
const addScore = () => {
    let score = parseInt(textField.value);
    Scores.addScore({ score: score, settings: { isSubscribedToPN: isSubscribedToPN } }, (err, data) => {
        if (err == 'User not logged in') {
            authManager.enforceLogin();
        }
        else if (err) console.error(err);

        if (data) {
            console.log("From callback")
        }
    });
}



//Edit the score of the user
const editScore = () => {
    Scores.editDailyScore({ score: parseInt(editScoreInput.value), settings: { isSubscribedToPN: isSubscribedToPN } }, (err, data) => {
        if (err == 'User not logged in') {
            authManager.enforceLogin();
            return
        }
        if (err) console.error(err);
    });
}

//get previous user settings
const load = () => {
    authManager.getCurrentUserNew()
    UserSettings.get((err, settings) => {
        if (err) console.log(err)
        if (settings && settings.isSubscribedToPN) {
            isSubscribedToPN = settings.isSubscribedToPN;
        }
    })
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

const switchTab = (activeTab) => {
    // Turn on active tab
    console.log("switching")
    switch (activeTab) {
        case 'Overall':
            overallHeader.classList.add('active-header');
            dayHeader.classList.remove('active-header');
            weekHeader.classList.remove('active-header');
            monthHeader.classList.remove('active-header');
            break;
        case 'Day':
            dayHeader.classList.add('active-header');
            overallHeader.classList.remove('active-header');
            weekHeader.classList.remove('active-header');
            monthHeader.classList.remove('active-header');
            break;
        case 'Month':
            monthHeader.classList.add('active-header');
            dayHeader.classList.remove('active-header');
            weekHeader.classList.remove('active-header');
            overallHeader.classList.remove('active-header');
            break;
        case 'Week':
            weekHeader.classList.add('active-header');
            dayHeader.classList.remove('active-header');
            monthHeader.classList.remove('active-header');
            overallHeader.classList.remove('active-header');
            break;
        default:
            break;
    }
}

const toggleShowDrawer = () => {
    if (drawer.classList.contains('hide')) {
        drawer.classList.remove('hide');
    }
    else {
        drawer.classList.add('hide');
    }
}

const toggleDrawerSize = () => {
    if (drawer.classList.contains('small')) {
        drawer.classList.remove('small');
    }
    else {
        drawer.classList.add('small');
    }
}

const renderScoreRow = (score, index, userScore) => {
    let row = ui('div', drawerScoresContainer, null, ['score-row', (index == 0 && userScore) ? 'user-score' : null], null);
    let rank = ui('h5', row, "#" + (index + 1), ['score-rank']);
    let image = ui('img', row, null, ['score-image'], score.displayPictureUrl);
    let scoreDiv = ui('div', row, null, ['score-scoreDiv']);
    let name = ui('p', scoreDiv, score.displayName, ['score-name']);
    let scoreP = ui('p', scoreDiv, score.currentScore, ['score-score']);
}

const renderLeaderboard = (leaderboardType, scores, userScore, size) => {
    let drawerScores = [];

    if (scores && scores.length > 0) {
        if (userScore) drawerScores.push(userScore);
        if (size == 'small') {
            if (drawerScores.length > 3) {
                drawerScores.push(scores[0]);
                drawerScores.push(scores[1]);
                drawerScores.push(scores[2]);
            }
            else {
                drawerScores.push(...scores);
            }
        }
        else {
            drawerScores.push(...scores);
        }
        //render the rows
        drawerScores.forEach((score, index) => {
            renderScoreRow(score, index, userScore);
        });
    }
    // scores.forEach(score => {

    // });
}

//Toggle the view where the user adds the score
const showAddScoreView = () => {
    if (authManager.currentUser) {
        user = authManager.currentUser;
        dialog.open();
    }

    else {
        authManager.enforceLogin();
    }
}

//get list of score of a leaderboard
const getScores = (leaderboardType, cb) => {
    Scores.getScores({ leaderboardType: leaderboardType, settings: { isSubscribedToPN: isSubscribedToPN } }, (err, scores) => {
        cb(scores);
    })
}

load()

//fetch the overall scores
overallScores = getScores('overall', (scores) => {
    renderLeaderboard("overall", scores, null, 'small');
});

console.log("dialog", dialog)
dialog.listen('MDCDialog:opened', function () {
    // Assuming contentElement references a common parent element with the rest of the page's content
    contentElement.setAttribute('aria-hidden', 'true');
});
dialog.listen('MDCDialog:closing', function () {
    contentElement.removeAttribute('aria-hidden');
});


// dialog.open();

