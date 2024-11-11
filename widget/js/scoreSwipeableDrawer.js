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
    state.currentListScores = scores;
    const drawerScoresContainer = document.getElementById('drawerScoresContainer');
    drawerScoresContainer.innerHTML = '';

    let currentUserScore;

    scores.forEach((score, index) => {
      let row = null;
      let rank = null;
      let leftContainer = null;
      let imageContainer = null;
      let rankContainer = null;
      let imageSkeletonContainer = null;
      let image = null;
      if (index === 0) {
        row = widgetHelper.ui('div', drawerScoresContainer, null, ['score-row', 'first'], null);
        leftContainer = widgetHelper.ui('div', row, null, ['score-row-left'], null);
        rankContainer = widgetHelper.ui('div', leftContainer, null, ['rank-container'], null);
        rank = widgetHelper.ui('img', rankContainer, null, ['score-icon'], './images/number-one.svg');
        imageContainer = widgetHelper.ui('div', leftContainer, null, ['score-image-container'], null);
        imageSkeletonContainer = widgetHelper.ui('div', imageContainer, null, ['score-image', 'loading-image', 'first'], widgetHelper.getDefaultUserAvatar(), 'profile', 0);
        image = widgetHelper.ui('img', imageSkeletonContainer, null, ['score-image', 'first', 'user-image'], widgetHelper.getDefaultUserAvatar(), 'profile', 0);
      } else if (index === 1) {
        row = widgetHelper.ui('div', drawerScoresContainer, null, ['score-row', 'second'], null);
        leftContainer = widgetHelper.ui('div', row, null, ['score-row-left'], null);
        rankContainer = widgetHelper.ui('div', leftContainer, null, ['rank-container'], null);
        rank = widgetHelper.ui('img', rankContainer, null, ['score-icon'], './images/number-two.svg');
        imageContainer = widgetHelper.ui('div', leftContainer, null, ['score-image-container'], null);
        imageSkeletonContainer = widgetHelper.ui('div', imageContainer, null, ['score-image', 'loading-image', 'second'], widgetHelper.getDefaultUserAvatar(), 'profile', 0);
        image = widgetHelper.ui('img', imageSkeletonContainer, null, ['score-image', 'second', 'user-image'], widgetHelper.getDefaultUserAvatar(), 'profile', 1);
      } else if (index === 2) {
        row = widgetHelper.ui('div', drawerScoresContainer, null, ['score-row', 'third'], null);
        leftContainer = widgetHelper.ui('div', row, null, ['score-row-left'], null);
        rankContainer = widgetHelper.ui('div', leftContainer, null, ['rank-container'], null);
        rank = widgetHelper.ui('img', rankContainer, null, ['score-icon'], './images/number-three.svg');
        imageContainer = widgetHelper.ui('div', leftContainer, null, ['score-image-container'], null);
        imageSkeletonContainer = widgetHelper.ui('div', imageContainer, null, ['score-image', 'loading-image', 'third'], widgetHelper.getDefaultUserAvatar(), 'profile', 0);
        image = widgetHelper.ui('img', imageSkeletonContainer, null, ['score-image', 'third', 'user-image'], widgetHelper.getDefaultUserAvatar(), 'profile', 2);
      } else {
        row = widgetHelper.ui('div', drawerScoresContainer, null, ['score-row'], null);
        leftContainer = widgetHelper.ui('div', row, null, ['score-row-left'], null);
        rankContainer = widgetHelper.ui('div', leftContainer, null, ['rank-container'], null);
        rank = widgetHelper.ui('h5', rankContainer, `#${index + 1}`, ['score-rank']);
        imageContainer = widgetHelper.ui('div', leftContainer, null, ['score-image-container'], null);
        imageSkeletonContainer = widgetHelper.ui('div', imageContainer, null, ['score-image', 'loading-image'], widgetHelper.getDefaultUserAvatar(), 'profile', 0);
        image = widgetHelper.ui('img', imageSkeletonContainer, null, ['score-image', 'user-image'], widgetHelper.getDefaultUserAvatar(), 'profile');
      }
      imageSkeletonContainer.id = `profilePictureContainer_${index}`;
      image.id = `profilePicture_${index}`;
      this.validateUserImage(score, index);

      const scoreDiv = widgetHelper.ui('div', row, null, ['score-row-right']);
      const name = widgetHelper.ui('p', scoreDiv, score.displayName, ['score-name']);
      const scoreP = widgetHelper.ui('p', scoreDiv, score.currentScore || '0', ['score-score']);

      if (authManager.currentUser && score.userId === authManager.currentUser.userId) {
        currentUserScore = { ...score, rank: index + 1 };
        if (state.settings.userEarnPoints === enums.EARN_POINTS.HONOR_SYSTEM && state.activeTab === enums.Keys.daily) {
          const editIcon = widgetHelper.ui('span', scoreP, null, ['edit-score-icon']);
          editIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
                                <path d="M0 14.25V18H3.75L14.81 6.94L11.06 3.19L0 14.25ZM17.71 4.04C18.1 3.65 18.1 3.02 17.71 2.63L15.37 0.289998C14.98 -0.100002 14.35 -0.100002 13.96 0.289998L12.13 2.12L15.88 5.87L17.71 4.04Z" fill="#46BFE6"></path>
                                </svg>`;

          editIcon.onclick = () => {
            homePage.openScoreDialog('edit');
          };
        }
      }
    });

    let toastStringKey;
    if (currentUserScore) {
      const expressionContext = {
        userRank: currentUserScore.rank,
        userScore: currentUserScore.currentScore,
      };
      widgetHelper.setDynamicExpressionContext(expressionContext);

      toastStringKey = 'scoreboard.rankedUserToast';
    } else if (authManager.currentUser) {
      toastStringKey = 'scoreboard.nonRankedUserToast';
    }

    if (toastStringKey) {
      getStringValue(toastStringKey).then((toastMEssage) => {
        buildfire.dialog.toast({
          message: toastMEssage,
          hideDismissButton: true,
          duration: 5000,
        });
      });
    }
  },

  validateUserImage(userScoreObj, index) {
    widgetHelper.validateImage(userScoreObj.displayPictureUrl).then((isValid) => {
      let updatedImage;
      if (isValid) {
        updatedImage = buildfire.imageLib.cropImage(userScoreObj.displayPictureUrl, { size: 'm', aspect: '1:1' });
      } else {
        updatedImage = widgetHelper.getDefaultUserAvatar();
      }

      const imageContainer = document.getElementById(`profilePictureContainer_${index}`);
      const image = document.getElementById(`profilePicture_${index}`);

      image.src = updatedImage;
      imageContainer.classList.remove('loading-image');
    });
  },

  switchTab(newTab) {
    state.activeTab = newTab;

    const currentActiveTab = document.querySelector('.active-header');
    if (currentActiveTab) {
      currentActiveTab.classList.remove('active-header');
    }

    const selectedTabElement = document.getElementById(newTab);
    selectedTabElement.classList.add('active-header');

    this.toggleDrawerSkeleton();

    widgetController.getScores(newTab)
      .then((scores) => {
        this.toggleDrawerSkeleton();

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

    const drawerScoresContainer = document.querySelector('.swipeable-drawer-content');

    drawerScoresContainer.onmousedown = this.handleTouchStart.bind(this);
    drawerScoresContainer.onmouseup = this.handleTouchEnd.bind(this);
    drawerScoresContainer.ontouchstart = this.handleTouchStart.bind(this);
    drawerScoresContainer.ontouchmove = this.handleTouchEnd.bind(this);
  },

  prepareDrawerOptions() {
    const drawerHeader = document.createElement('div');
    drawerHeader.id = 'drawerHeader';
    drawerHeader.className = 'drawer-header';

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
      transitionDuration: 150,
    };
  },

  toggleDrawerSkeleton() {
    const drawerScoresContainer = document.getElementById('drawerScoresContainer');
    if (this.skeleton) {
      this.skeleton.stop();
      this.skeleton = null;

      drawerScoresContainer.innerHTML = '';
    } else {
      drawerScoresContainer.innerHTML = '';

      this.skeleton = new buildfire.components.skeleton('#drawerScoresContainer', { type: 'list-item-avatar-two-line, list-item-avatar-two-line, list-item-avatar-two-line, list-item-avatar-two-line' });
      this.skeleton.start();
    }
  },

  init() {
    const drawerOptions = this.prepareDrawerOptions();

    buildfire.components.swipeableDrawer.initialize(drawerOptions, () => { });
    this.initDrawerListeners();
  },
};
