const authManager = {
  _currentUser: null,
  get currentUser() {
    return authManager._currentUser;
  },
  set currentUser(user) {
    authManager._currentUser = user;
  },

  refreshCurrentUser() {
    return new Promise((resolve) => {
      buildfire.auth.getCurrentUser((err, user) => {
        authManager.currentUser = err || !user ? null : user;
        resolve();
      });
    });
  },

  enforceLogin() {
    buildfire.auth.getCurrentUser((err, user) => {
      if (!user) {
        buildfire.auth.login({ allowCancel: false }, (e, r) => {
          if (e || !r) {
            authManager.enforceLogin();
          } else {
            authManager.currentUser = user;
          }
        });
      } else {
        authManager.currentUser = user;
      }
    });
  },
};

buildfire.auth.onLogin(() => {
  window.location.reload();
});

buildfire.auth.onLogout(() => {
  window.location.reload();
});
