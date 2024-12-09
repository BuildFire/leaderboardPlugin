/* eslint-disable max-len */
const widgetHelper = {

  // easily create a ui element
  ui(elementType, appendTo, innerHTML, classNameArray, imageSource, imageType, rank) {
    const element = document.createElement(elementType);
    if (innerHTML) element.innerHTML = innerHTML;
    if (elementType === 'img') {
      element.src = imageSource;
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
    state.currentDynamicExpression = {
      ...state.currentDynamicExpression,
      ...expressionContext,
    };
    buildfire.dynamic.expressions.getContext = (options, callback) => {
      const context = {
        plugin: state.currentDynamicExpression,
      };
      callback(null, context);
    };
  },

  evaluateDynamicExpression(options, callback) {
    buildfire.dynamic.expressions.evaluate(options, callback);
  },

};
