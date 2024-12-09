const getLanguage = (key) => stringKeys[key];

const getStringValue = (key) => new Promise((resolve, reject) => {
  buildfire.language.get({ stringKey: key }, (err, res) => {
    if (err) {
      reject(err);
    }
    stringKeys[key] = res;
    resolve(res);
  });
});

const initLanguageStrings = () => new Promise((resolve, reject) => {
  const arr = Object.keys(stringKeys).map((el) => getStringValue(el));
  Promise.all(arr)
    .then((values) => resolve(values))
    .catch((error) => reject(error));
});
