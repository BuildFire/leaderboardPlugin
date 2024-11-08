class Settings {
  static get TAG() {
    return 'Settings';
  }

  static get() {
    return new Promise((resolve, reject) => {
      buildfire.datastore.get(Settings.TAG, (err, result) => {
        if (err) return reject(err);
        return resolve(result.data);
      });
    });
  }

  static save(data) {
    return new Promise((resolve, reject) => {
      buildfire.datastore.save(data, Settings.TAG, (err, result) => {
        if (err) return reject(err);
        return resolve(result);
      });
    });
  }
}
