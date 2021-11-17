class UserSettings {
    static TAG = "UserSettings"

    /**
     * Searches user data for settings
     * @param {Function} callback callback for handling response
     */
    static get(callback) {
        //Get existing settings from userstore
        buildfire.userData.get(UserSettings.TAG, (err, result) => {
            if (err) return callback("Error while retrieving your data");
            if (result && result.data && Object.keys(result.data).length > 0) {
                callback(null, new UserSetting(result.data))
            }
            else {
                callback(null, new UserSetting())
            }
        });
    }

    /**
     * Searches public data for entities with given options
     * @param {Object} data fields changed in settings
     * @param {Function} callback callback for handling response
     */
    static set(data, callback) {
        buildfire.userData.save(
            data,
            UserSettings.TAG,
            (err, result) => {
                if (err) return callback("Error while saving your data", err);

                callback(new UserSetting(result.data));
            }
        );
    }
}