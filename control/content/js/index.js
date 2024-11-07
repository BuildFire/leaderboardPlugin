/// create a new instance of the buildfire carousel editor
const editor = new buildfire.components.carousel.editor('#contentCarousel');

/// handle the loading
function loadItems(carouselItems) {
  // create an instance and pass it the items if you don't have items yet just pass []
  editor.loadItems(carouselItems);
}

/// call buildfire datastore to see if there are any previously saved items
buildfire.datastore.get((err, obj) => {
  if (err) console.error('error');
  else loadItems(obj.data.carouselItems);
});

/// save any changes in items
function save(items) {
  buildfire.datastore.save({ carouselItems: items }, (e) => {
    if (e) console.error('error');
    else console.log('saved.');
  });
}

// // this method will be called when a new item added to the list
editor.onAddItems = editor.onDeleteItem = editor.onItemChange = editor.onOrderChange = function () {
  save(editor.items);
};

// Register push notifications event
const load = () => {
  for (const propName in analyticKeys) {
    buildfire.analytics.registerEvent(
      analyticKeys[propName],
      {
        silentNotification: true,
      },
    );
  }
};

let timerDelay = null;
tinymce.init({
  selector: '#wysiwygContent',
  setup: (editor) => {
    editor.on('change keyUp', (e) => {
      if (timerDelay) clearTimeout(timerDelay);
      timerDelay = setTimeout(() => {
        const wysiwygContent = tinymce.activeEditor.getContent();
        saveWYSContent(wysiwygContent);
      }, 500);
    });
    editor.on('init', () => {
      // Check datastore for previous content
      buildfire.datastore.get('wysContent', (err, result) => {
        if (err) return console.error('Error while getting your data', err);
        if (result && result.data && result.data.content) {
          console.log('Content found in datastore', result);
          editor.setContent(result.data.content);
        }
      });
    });
  },
});

// Save content to datastore
const saveWYSContent = (content) => {
  if (content) {
    buildfire.datastore.save(
      { content },
      'wysContent',
      (err, result) => {
        if (err) return console.error('Error while saving your data', err);
      },
    );
  }
};

window.onload = () => {
  load();
};
