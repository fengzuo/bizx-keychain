var Config = {
    landingPages : [ 'orgchart', 'admin', 'settings' ]
};

/**
 * A view for the bookmark form to modify or add a new bookmark.
 * 
 * @class
 * @name BookmarkForm
 * @extends Backbone.View
 */
var BookmarkForm = Backbone.View.extend(/** @lends BookmarkForm.prototype */
{
    el : '#editForm',
    events : {
        'change #fullURL' : function(e) {
            var bookmark = new BookmarkModel();
            if (bookmark.setURL(e.target.value)) {
                this._updateForm(bookmark, true);
            }
        },
        'change' : function(e) {
            if (e.target.id != 'fullURL') {
                var bookmark = this._createBookmark();
                if (bookmark) {
                    $('#fullURL', this.$el).val(bookmark.getURL());
                }
                this._setSubmitEnabled(!!bookmark);
            }
        },
        'focus #fullURL' : function(e) {
            setTimeout(function() {
                $(e.target).select();
            }, 0);
        },
        'submit' : function(e) {
            e.preventDefault();
            this.submit();
        }
    },
    initialize : function() {
        var _this = this;
        $('#submit').click(function() {
            _this.submit();
        });
        $('#delete').click(function() {
            if (_this._bookmark) {
                BOOKMARKS.remove(_this._bookmark);
            }
        });
    },
    render : function() {
        var $deepLink = $('select[name=deepLink]', this.$el);
        Config.landingPages.forEach(function(landingPage) {
            $deepLink.append($('<option></option>').text(landingPage));
        });
        return this;
    },
    submit : function() {
        $.mobile.navigate('#index', {
            transition : 'none'
        });
        BOOKMARKS.change(this._bookmark, this._createBookmark());
    },
    setBookmark : function(bookmark) {
        this._bookmark = bookmark;
        this._updateForm(bookmark);
        this._setSubmitEnabled(!!bookmark);
    },
    isValid : function() {
        return !!this._createBookmark();
    },
    _setSubmitEnabled : function(enabled) {
        $('#submit', this.$el)[enabled ? 'removeClass' : 'addClass']('ui-disabled');
    },
    _updateForm : function(bookmark, fullUrl) {
        var form = this.$el[0];
        'deepLink baseURL company username password'.split(' ').forEach(function(key) {
            form[key].value = bookmark ? bookmark.get(key) || '' : '';
        }, this);
        if (!fullUrl) {
            var tags = (bookmark && bookmark.get('tags')) || [];
            form.tags.value = tags.join(', ');
            form.fullURL.value = bookmark ? bookmark.getURL() : '';
        }
        this._setSubmitEnabled(this.isValid());
    },
    _createBookmark : function() {
        var attrs = {
            tags : []
        };
        var form = this.$el[0];
        'deepLink baseURL company username password'.split(' ').forEach(function(key) {
            attrs[key] = form[key].value;
        }, this);
        form.tags.value.split(',').forEach(function(tag) {
            tag = tag.trim();
            if (tag) {
                attrs.tags.push(tag);
            }
        });
        var bookmark = new BookmarkModel(attrs);
        if (bookmark.isValid()) {
            return bookmark;
        }
    }
});

/**
 * A view for one bookmark line item.
 * 
 * @class
 * @name BookmarkView
 * @extends Backbone.View
 */
var BookmarkView = Backbone.View.extend(/** @lends BookmarkView.prototype */
{
    tagName : 'li',
    initialize : function() {
        this.listenTo(this.model, {
            'change:baseURL change:company change:username change:deepLink' : this.updateSummary,
            'change:tags' : this.updateTags
        });
    },
    events : {
        'click .openBookmark' : function() {
            BOOKMARKS.remove(this.model);
            BOOKMARKS.add(this.model, {
                at : 0
            });
            window.open(this.model.getURL());
        },
        'click .editBookmark' : function() {
            BOOKMARK_FORM.setBookmark(this.model);
        },
        'click .deleteBookmark' : function(e) {
            BOOKMARKS.remove(this.model);
            e.preventDefault();
        }
    },
    render : function() {
        $('#addBookmark').click(function() {
            BOOKMARK_FORM.setBookmark(null);
        });
        $('<div class="deleteBookmark"><a href="#">Delete</a></div>').appendTo(this.$el);
        var $bookmark = $('<a class="openBookmark" href="#">').appendTo(this.$el);
        $('<h3></h3>').text(this.model.getSummary()).appendTo($bookmark);
        $('<p class="tags"></p>').appendTo($bookmark);
        $('<a class="editBookmark" href="#editBookmark" data-transition="none">Edit</a>').appendTo(this.$el);
        this.updateTags();
        return this;
    },
    updateSummary : function() {
        $('h3', this.$el).text(this.model.getSummary());
    },
    updateTags : function() {
        var $tags = $('.tags', this.$el).empty();
        this.model.attributes.tags.forEach(function(tag, i) {
            $tags.append(i == 0 ? '' : ', ').append($('<span>').text(tag));
        });
    }
});

/**
 * A generic jQuery Mobile ListView that can take a collection and handle the
 * collection events.
 * 
 * @class
 * @name ListView
 * @extends Backbone.View
 */
var ListView = Backbone.View.extend(/** @lends ListView.prototype */
{
    constructor : function(options) {
        this._itemView = options && options.itemView;
        Backbone.View.call(this, options);
    },

    initialize : function() {
        this._views = {};
        this.collection && this.setCollection(this.collection);
    },

    render : function() {
        this.collection && _.each(this.collection.models, function(model) {
            this.getItemView(model).render().$el.appendTo(this.$el);
        }, this);
        return this;
    },

    enhance : function() {
        if (this.$el.parents('div[data-role=page]').hasClass('ui-page')) {
            this.$el.listview('refresh');
        }
    },

    setCollection : function(collection) {
        this.collection && this.stopListening(this.collection);
        this.collection = collection;
        this.collection && this.listenTo(this.collection, {
            reset : this._reset,
            add : this._add,
            remove : this._remove,
            sort : this._sort
        });
        this._reset();
    },

    createItem : function(model) {
        var targetView = this._itemView;
        return new targetView({
            model : model
        });
    },

    getItemView : function(model) {
        var id = model.get(model.idAttribute);
        var view = this._views[id];
        if (!view) {
            view = this._views[id] = this.createItem(model);
        }
        return view;
    },

    removeView : function(view) {
        view.$el.remove();
    },

    /**
     * @private
     */
    _reset : function(collection, options) {
        var _this = this;
        this._views && $.each(this._views, function() {
            _this._removeView(this);
        }, this);
        this._views = {};
        this.render();
        this.enhance();
    },

    /**
     * @private
     */
    _add : function(model, collection, options) {
        var at = options.at;
        var view = this.getItemView(model);
        var el = view.render().$el;
        if (at != null) {
            var children = this.$el.children();
            if (children.length > at) {
                el.insertBefore(children[at]);
            } else {
                el.appendTo(this.$el);
            }
        } else {
            el.appendTo(this.$el);
        }
        this.enhance();
    },

    /**
     * @private
     */
    _remove : function(model, collection, options) {
        var id = model.get(model.idAttribute);
        var view = this._views[id];
        view && this._removeView(view);
        this.enhance();
    },

    /**
     * @private
     */
    _removeView : function(view) {
        var model = view.model;
        var id = model.get(model.idAttribute);
        view.$el.detach().remove();
        delete this._views[id];
    },

    /**
     * @private
     */
    _sort : function(collection, options) {
        this._reset();
    }
});

$('#importSubmit').click(function() {
    var input = $('#importContent');
    BOOKMARKS.import(input.val());
    input.val('');
});

$('#importLink').click(function() {
    setTimeout(function() {
        $('#importContent').focus();
    }, 0);
});

$('#exportLink').click(function() {
    var json = BOOKMARKS.retrieve();
    $('#exportContent').html(json);
    setTimeout(function() {
        $('#exportContent').focus();
    }, 0);
});

$('#exportContent').focus(function() {
    var _this = this;
    setTimeout(function() {
        $(_this).select();
    }, 0);
});