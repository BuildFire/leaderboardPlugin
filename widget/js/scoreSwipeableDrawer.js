const scoreSwipeableDrawer = {
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

  renderScoreRow() {

  },

  switchTab(newTab) {
    state.activeTab = newTab;

    const currentActiveTab = document.querySelector('.active-header');
    currentActiveTab?.classList.remove('active-header');

    const selectedTabElement = document.getElementById(newTab);
    selectedTabElement.classList.add('active-header');

    this.toggleDrawerSkeleton();

    widgetController.getScores(newTab).then((scores) => {
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

      if (currentUserScore && currentUserScore.rank <= 3) {
        buildfire.dialog.toast({ message: `You are ranked #${currentUserScore.rank} with ${currentUserScore.currentScore} points` });
      } else if (currentUserScore) {
        buildfire.dialog.toast({ message: 'You are not ranked in top 100' });
      }
    }).catch((err) => {
      console.error(err);
    });
  },

  initDrawerListeners() {
    const tabs = document.querySelectorAll('.drawer-header-title');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        this.switchTab(tab.id);
      });
    });
  },

  prepareDrawerOptions() {
    const drawerHeader = document.createElement('div');
    drawerHeader.id = 'drawerHeader';

    const drawerMenu = document.createElement('div');
    drawerMenu.className = 'drawer-menu';

    this.tabs.forEach((tab) => {
      const tabElement = document.createElement('div');
      tabElement.classList.add('drawer-header-title');
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

    return {
      startingStep: 'mid',
      header: drawerHeader.outerHTML,
      content: drawerContent.outerHTML,
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
