
window.onload = function () {
// Handle browser mouse swipes
var scoreTouchstartX = 0;
var scoreTouchstartY = 0;
var scoreTouchendX = 0;
var scoreTouchendY = 0;

var indicatorTouchstartX = 0;
var indicatorTouchstartY = 0;
var docTouchendX = 0;
var docTouchendY = 0;

var threshold = 50;


document.getElementById('drawerScoresContainer').addEventListener('mousedown', function (event) {
    scoreTouchstartX = event.screenX;
    scoreTouchstartY = event.screenY;
}, false);

document.getElementById('drawerScoresContainer').addEventListener('mouseup', function (event) {
    scoreTouchendX = event.screenX;
    scoreTouchendY = event.screenY;
    handleScoreGesture();
}, false);

swipeIndicator.addEventListener('mousedown', function (event) {
    indicatorTouchstartX = event.screenX;
    indicatorTouchstartY = event.screenY;
}, false);

document.addEventListener('mouseup', function (event) {
    docTouchendX = event.screenX;
    docTouchendY = event.screenY;
    if (indicatorTouchstartX != 0)
        handleSwipeGesture();
}, false);



function handleSwipeGesture() {
    console.log("Swipe gesture detected");
    if (docTouchendX < indicatorTouchstartX && indicatorTouchstartX - docTouchendX > threshold) {
        //indic swiped left
    }
    if (docTouchendX > indicatorTouchstartX && docTouchendX - indicatorTouchstartX > threshold) {
        // indic swiped right
    }
    if (docTouchendY < indicatorTouchstartY && indicatorTouchstartY - docTouchendY > threshold) {
        enlargeBoard();
    }
    if (docTouchendY > indicatorTouchstartY && docTouchendY - indicatorTouchstartY > threshold) {
        minfifyBoard();
    }
    indicatorTouchstartX = 0;
    indicatorTouchstartY = 0;
    docTouchendX = 0;
    docTouchendY = 0;

}

function handleScoreGesture() {
    if (scoreTouchendX != 0) {
        // Do not register taps
        if (scoreTouchendX < scoreTouchstartX && scoreTouchstartX - scoreTouchendX > threshold) {
            switch (currentActiveTab) {
                case Keys.overall:
                    switchTab(Keys.monthly);
                    break;
                case Keys.monthly:
                    switchTab(Keys.weekly);
                    break;
                case Keys.weekly:
                    switchTab(Keys.daily);
                    break;
                case Keys.daily:
                    switchTab(Keys.overall);
                    break;
                default:
                    break;
            }

            console.log(scoreTouchendX + ' ' + scoreTouchstartX);
        }
        if (scoreTouchendX > scoreTouchstartX && scoreTouchendX - scoreTouchstartX > threshold) {
            switch (currentActiveTab) {
                case Keys.overall:
                    switchTab(Keys.daily);
                    break;
                case Keys.monthly:
                    switchTab(Keys.overall);
                    break;
                case Keys.weekly:
                    switchTab(Keys.monthly);
                    break;
                case Keys.daily:
                    switchTab(Keys.weekly);
                    break;
                default:
                    break;
            }
        }
        if (scoreTouchendY < scoreTouchstartY && scoreTouchstartY - scoreTouchendY > threshold) {
            enlargeBoard();
        }
        if (scoreTouchendY > scoreTouchstartY && scoreTouchendY - scoreTouchstartY > threshold) {
            console.log('swiped down');
        }
    }
}


// Handle mobile swipe gestures


swipeIndicator.addEventListener('touchstart', handleTouchStart, false);
swipeIndicator.addEventListener('touchmove', handleIndicatorTouchMove, false);

if (currentSize == 'small') {
    drawerScoresContainer.addEventListener('touchstart', handleTouchStart, false);
    drawerScoresContainer.addEventListener('touchmove', handleScoreTouchMove, false);
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

function handleIndicatorTouchMove(evt) {
    if (!xDown || !yDown) {
        return;
    }

    var xUp = evt.touches[0].clientX;
    var yUp = evt.touches[0].clientY;

    var xDiff = xDown - xUp;
    var yDiff = yDown - yUp;

    if (Math.abs(xDiff) > Math.abs(yDiff)) {/*most significant*/
        if (xDiff > 0) {
           
        } else {
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


function handleScoreTouchMove(evt) {
    if (!xDown || !yDown) {
        return;
    }

    var xUp = evt.touches[0].clientX;
    var yUp = evt.touches[0].clientY;

    var xDiff = xDown - xUp;
    var yDiff = yDown - yUp;

    if (Math.abs(xDiff) > Math.abs(yDiff)) {/*most significant*/
        if (xDiff > 0) {
            switch (currentActiveTab) {
                case Keys.overall:
                    switchTab(Keys.monthly);
                    break;
                case Keys.monthly:
                    switchTab(Keys.weekly);
                    break;
                case Keys.weekly:
                    switchTab(Keys.daily);
                    break;
                case Keys.daily:
                    switchTab(Keys.overall);
                    break;
                default:
                    break;
            }
        } else {
            switch (currentActiveTab) {
                case Keys.overall:
                    switchTab(Keys.daily);
                    break;
                case Keys.monthly:
                    switchTab(Keys.overall);
                    break;
                case Keys.weekly:
                    switchTab(Keys.monthly);
                    break;
                case Keys.daily:
                    switchTab(Keys.weekly);
                    break;
                default:
                    break;
            }
        }
    } else {
        if (yDiff > 0) {
            enlargeBoard();
        } else {
            
        }
    }
    /* reset values */
    xDown = null;
    yDown = null;
};
};