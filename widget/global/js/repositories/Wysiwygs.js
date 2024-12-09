class Wysiwygs {
  static get TAG() {
    return 'wysContent';
  }

  static save(data) {
    return new Promise((resolve, reject) => {
      buildfire.datastore.save(data, this.TAG, (e) => {
        if (e) return reject(e);
        return resolve();
      });
    });
  }

  static get() {
    return new Promise((resolve, reject) => {
      buildfire.datastore.get(this.TAG, (e, result) => {
        if (e) return reject(e);
        return resolve(result.data);
      });
    });
  }
}
