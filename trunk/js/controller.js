var BOOKMARKS = new BookmarkCollection();
var BOOKMARKS_VIEW = new ListView({
    el : '#bookmarks',
    collection : BOOKMARKS,
    itemView : BookmarkView
});
var BOOKMARK_FORM = new BookmarkForm().render();