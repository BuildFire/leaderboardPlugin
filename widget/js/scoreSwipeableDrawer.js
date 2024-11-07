const scoreSwipeableDrawer = {
  startTouchAtX: 0,
  startTouchAtY: 0,
  endTouchAtX: 0,
  endTouchAtY: 0,

  tabs: [
    { id: enums.Keys.overall, title: 'scoreboard.overall' },
    { id: enums.Keys.monthly, title: 'scoreboard.month' },
    { id: enums.Keys.weekly, title: 'scoreboard.week' },
    { id: enums.Keys.daily, title: 'scoreboard.day' },
  ],

  toggleDrawer(show = true) {
    if (show) {
      buildfire.components.swipeableDrawer.show();
    } else {
      buildfire.components.swipeableDrawer.hide();
    }
  },

  renderScoreList(scores) {
    const drawerScoresContainer = document.getElementById('drawerScoresContainer');
    drawerScoresContainer.innerHTML = '';

    let currentUserScore;

    scores.forEach((score, index) => {
      if (score.userId === authManager.currentUser.userId) {
        currentUserScore = { ...score, rank: index + 1 };
      }
      let row = null;
      let rank = null;
      let leftContainer = null;
      let imageContainer = null;
      let rankContainer = null;
      let image = null;
      if (index === 0) {
        row = ui('div', drawerScoresContainer, null, ['score-row', 'first'], null);
        leftContainer = ui('div', row, null, ['score-row-left'], null);
        rankContainer = ui('div', leftContainer, null, ['rank-container'], null);
        rank = ui('img', rankContainer, null, ['score-icon'], './images/number-one.svg');
        imageContainer = ui('div', leftContainer, null, ['score-image-container'], null);
        image = ui('img', imageContainer, null, ['score-image', 'first'], score.displayPictureUrl, 'profile', 0);
      } else if (index === 1) {
        row = ui('div', drawerScoresContainer, null, ['score-row', 'second'], null);
        leftContainer = ui('div', row, null, ['score-row-left'], null);
        rankContainer = ui('div', leftContainer, null, ['rank-container'], null);
        rank = ui('img', rankContainer, null, ['score-icon'], './images/number-two.svg');
        imageContainer = ui('div', leftContainer, null, ['score-image-container'], null);
        image = ui('img', imageContainer, null, ['score-image', 'second'], score.displayPictureUrl, 'profile', 1);
      } else if (index === 2) {
        row = ui('div', drawerScoresContainer, null, ['score-row', 'third'], null);
        leftContainer = ui('div', row, null, ['score-row-left'], null);
        rankContainer = ui('div', leftContainer, null, ['rank-container'], null);
        rank = ui('img', rankContainer, null, ['score-icon'], './images/number-three.svg');
        imageContainer = ui('div', leftContainer, null, ['score-image-container'], null);
        image = ui('img', imageContainer, null, ['score-image', 'third'], score.displayPictureUrl, 'profile', 2);
      } else {
        row = ui('div', drawerScoresContainer, null, ['score-row'], null);
        leftContainer = ui('div', row, null, ['score-row-left'], null);
        rankContainer = ui('div', leftContainer, null, ['rank-container'], null);
        rank = ui('h5', rankContainer, `#${index + 1}`, ['score-rank']);
        imageContainer = ui('div', leftContainer, null, ['score-image-container'], null);
        image = ui('img', imageContainer, null, ['score-image'], score.displayPictureUrl, 'profile');
      }
      const scoreDiv = ui('div', row, null, ['score-row-right']);
      const name = ui('p', scoreDiv, score.displayName, ['score-name']);
      const scoreP = ui('p', scoreDiv, score.currentScore, ['score-score']);
    });

    if (currentUserScore && Number(currentUserScore.currentScore) > 0) {
      if (currentUserScore.rank <= 3) {
        buildfire.dialog.toast({ message: `You are ranked #${currentUserScore.rank} with ${currentUserScore.currentScore} points` });
      } else {
        buildfire.dialog.toast({ message: 'You are not ranked in top 100' });
      }
    }
  },

  switchTab(newTab) {
    state.activeTab = newTab;

    const currentActiveTab = document.querySelector('.active-header');
    currentActiveTab?.classList.remove('active-header');

    const selectedTabElement = document.getElementById(newTab);
    selectedTabElement.classList.add('active-header');

    this.toggleDrawerSkeleton();

    widgetController.getScores(newTab)
      .then((scores) => {
        if (scores && scores.length) {
          this.renderScoreList(scores);
        } else {
          const emptyScores = state.overallScores.map((score) => ({ ...score, currentScore: '0' }));
          this.renderScoreList(emptyScores);
        }
      }).catch((err) => {
        console.error(err);
      });
  },

  handleTouchStart(event) {
    if (buildfire.getContext().device.platform === 'web') {
      this.startTouchAtX = event.screenX;
      this.startTouchAtY = event.screenY;
    } else {
      this.startTouchAtX = event.touches[0].screenX;
      this.startTouchAtY = event.touches[0].screenY;
    }
  },

  handleTouchEnd(event) {
    clearTimeout(this.touchTimer);
    this.touchTimer = setTimeout(() => {
      if (buildfire.getContext().device.platform === 'web') {
        this.endTouchAtX = event.screenX;
        this.endTouchAtY = event.screenY;
      } else {
        this.endTouchAtX = event.touches[0].screenX;
        this.endTouchAtY = event.touches[0].screenY;
      }

      const xDiff = this.startTouchAtX - this.endTouchAtX;
      const yDiff = this.startTouchAtY - this.endTouchAtY;

      if (Math.abs(xDiff) > Math.abs(yDiff)) {
        if (xDiff > 0) {
          switch (state.activeTab) {
            case enums.Keys.overall:
              this.switchTab(enums.Keys.monthly);
              break;
            case enums.Keys.monthly:
              this.switchTab(enums.Keys.weekly);
              break;
            case enums.Keys.weekly:
              this.switchTab(enums.Keys.daily);
              break;
            case enums.Keys.daily:
              this.switchTab(enums.Keys.overall);
              break;
            default:
              break;
          }
        } else {
          switch (state.activeTab) {
            case enums.Keys.overall:
              this.switchTab(enums.Keys.daily);
              break;
            case enums.Keys.monthly:
              this.switchTab(enums.Keys.overall);
              break;
            case enums.Keys.weekly:
              this.switchTab(enums.Keys.monthly);
              break;
            case enums.Keys.daily:
              this.switchTab(enums.Keys.weekly);
              break;
            default:
              break;
          }
        }
      }
    }, 100);
  },

  initDrawerListeners() {
    const tabs = document.querySelectorAll('.drawer-header-title');
    tabs.forEach((tab) => {
      tab.onclick = () => {
        this.switchTab(tab.id);
      };
    });

    const drawerScoresContainer = document.getElementById('drawerScoresContainer');

    drawerScoresContainer.onmousedown = this.handleTouchStart.bind(this);
    drawerScoresContainer.onmouseup = this.handleTouchEnd.bind(this);
    drawerScoresContainer.ontouchstart = this.handleTouchStart.bind(this);
    drawerScoresContainer.ontouchmove = this.handleTouchEnd.bind(this);
  },

  prepareDrawerOptions() {
    const drawerHeader = document.createElement('div');
    drawerHeader.id = 'drawerHeader';

    const drawerMenu = document.createElement('div');
    drawerMenu.className = 'drawer-menu';

    this.tabs.forEach((tab) => {
      const tabElement = document.createElement('div');
      tabElement.classList.add('drawer-header-title');
      if (tab.id === enums.Keys.overall) {
        tabElement.classList.add('active-header');
      }
      tabElement.id = tab.id;
      tabElement.innerHTML = `<p bfString="${tab.title}">${tab.title}</p>`;
      drawerMenu.appendChild(tabElement);
    });

    const drawerContent = document.createElement('div');
    drawerContent.className = 'drawer-content';

    const drawerScoresContainer = document.createElement('div');
    drawerScoresContainer.id = 'drawerScoresContainer';
    drawerScoresContainer.className = 'score-container';

    drawerHeader.appendChild(drawerMenu);
    drawerContent.appendChild(drawerScoresContainer);

    const drawerContainer = document.createElement('div');
    drawerContainer.id = 'drawerContainer';
    drawerContainer.appendChild(drawerHeader);
    drawerContainer.appendChild(drawerContent);

    return {
      startingStep: 'mid',
      content: drawerContainer.outerHTML,
      mode: 'steps',
      transitionDuration: 500,
    };
  },

  toggleDrawerSkeleton() {
    const drawerScoresContainer = document.getElementById('drawerScoresContainer');
    drawerScoresContainer.innerHTML = '';

    for (let index = 0; index < 10; index++) {
      const row = ui('div', drawerScoresContainer, null, ['loading-score-row'], null);
      const leftContainer = ui('div', row, null, ['score-row-left'], null);
      const rank = ui('div', leftContainer, null, ['loading-score-rank'], null);
      const imageContainer = ui('div', leftContainer, null, ['score-image-container'], null);
      const image = ui('div', imageContainer, null, ['loading-score-image'], null);
      const scoreDiv = ui('div', row, null, ['score-row-right']);
      const name = ui('div', scoreDiv, null, ['loading-score-name']);
      const scoreP = ui('p', scoreDiv, null, ['loading-score-score']);
    }
  },

  init() {
    const drawerOptions = this.prepareDrawerOptions();

    buildfire.components.swipeableDrawer.initialize(drawerOptions, () => { });
    this.initDrawerListeners();
  },
};
