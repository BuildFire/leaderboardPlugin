tinymce.init({
    selector: "#wysiwygContent",
    setup: function (editor) {
        editor.on('change', function () {
            saveWYSContent(editor.getContent())
        });
    }
});

// Check datastore for previous content
buildfire.datastore.get("wysContent", (err, result) => {
    if (err) return console.error("Error while getting your data", err);
    if (result && result.data && result.data.content) {
        tinymce.activeEditor.setContent(result.data.content);
        saveWYSContent(result.data.content);
    }
});

// Save content to datastore
const saveWYSContent = (content) => {
    if (content) {
        buildfire.datastore.save(
            { content: content },
            "wysContent",
            (err, result) => {
                if (err) return console.error("Error while saving your data", err);
            }
        );
    }
}