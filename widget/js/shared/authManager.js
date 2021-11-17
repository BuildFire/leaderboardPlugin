const authManager = {

    _currentUser: null,
    get currentUser() {
        return authManager._currentUser;
    },
    set currentUser(user) {
        authManager._currentUser = user;
        // authManager.onUserChange(user);
    },


    getCurrentUser() {
        buildfire.auth.getCurrentUser((err, user) => {
            if (user)
                authManager.currentUser = user;
        });
    },

    enforceLogin() {
        buildfire.auth.getCurrentUser((err, user) => {
            if (!user) {
                buildfire.auth.login({ allowCancel: false }, (err, user) => {
                    if (!user)
                        authManager.enforceLogin();
                    else
                        authManager.currentUser = user;
                });
            }
            else
                authManager.currentUser = user;
        });

    },
    enforceLoginWithCb(cb) {
        buildfire.auth.getCurrentUser((err, user) => {
            if (!user) {
                buildfire.auth.login({ allowCancel: false }, (err, user) => {
                    if (!user)
                        //  authManager.enforceLogin();
                        return cb(0)
                    else
                        authManager.currentUser = user;
                    return cb(1);
                });
            }
            else {
                authManager.currentUser = user;
                return cb(1);
            }
        });

    },

    onUserChange(user) {
        // authManager.currentUser = user;
    }
};

