class Carousels {
  static save(data) {
    return new Promise((resolve, reject) => {
      buildfire.datastore.save(data, (e) => {
        if (e) return reject(e);
        return resolve();
      });
    });
  }

  static get() {
    return new Promise((resolve, reject) => {
      buildfire.datastore.get((e, result) => {
        if (e) return reject(e);
        return resolve(result.data);
      });
    });
  }
}
