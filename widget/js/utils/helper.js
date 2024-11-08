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

        let isElementCropped = false;
        element.onload = () => {
          if (element.src.indexOf('avatar.png') < 0 && !isElementCropped) {
            isElementCropped = true;
            element.src = buildfire.imageLib.cropImage(imageSource, { width, height });
          }
        };
        element.onerror = () => {
          element.src = './images/avatar.png';
        };
      }
    }
    if (Array.isArray(classNameArray)) {
      classNameArray.forEach((_class) => element.classList.add(_class));
    }
    if (appendTo) appendTo.appendChild(element);
    return element;
  },

};
