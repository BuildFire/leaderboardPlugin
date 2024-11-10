/* eslint-disable max-len */
const widgetHelper = {

  // easily create a ui element
  ui(elementType, appendTo, innerHTML, classNameArray, imageSource, imageType, rank) {
    const element = document.createElement(elementType);
    if (innerHTML) element.innerHTML = innerHTML;
    if (elementType === 'img') {
      element.src = imageSource;
      if (imageType === 'profile') {
        let width = 40;
        let height = 40;

        if (rank === 0) {
          width = 80;
          height = 80;
        }

        if (rank === 1) {
          width = 64;
          height = 64;
        }

        if (rank === 2) {
          width = 64;
          height = 64;
        }
      }
    }
    if (Array.isArray(classNameArray)) {
      classNameArray.forEach((_class) => element.classList.add(_class));
    }
    if (appendTo) appendTo.appendChild(element);
    return element;
  },

  validateImage(imageUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = imageUrl;
      img.onload = () => {
        resolve(true);
      };
      img.onerror = () => {
        resolve(false);
      };
    });
  },

  getDefaultUserAvatar() {
    return 'https://app.buildfire.com/app/media/avatar.png';
  },

  setDynamicExpressionContext(expressionContext) {
    buildfire.dynamic.expressions.getContext = (options, callback) => {
      const context = {
        plugin: expressionContext,
      };
      callback(null, context);
    };
  },

  evaluateDynamicExpression(options, callback) {
    buildfire.dynamic.expressions.evaluate(options, callback);
  },

};
