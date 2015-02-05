/**
 * A preferences model which will persist everything to localStorage.
 * 
 * @class
 * @name Preferences
 */
var Preferences = Backbone.Model.extend({
    initialize : function() {
        var stored = localStorage.preferences;
        if (typeof stored == 'string') {
            try {
                this.set(JSON.parse(stored));
            } catch (e) {
                // parse exceptions ignored
            }
        } else {
            this.set({
                landingPage : 'default'
            });
        }
        this.on('change', _.bind(this.store, this));
    },

    store : function() {
        localStorage.preferences = JSON.stringify(this.attributes);
    }
});

/**
 * A model for one bookmark.
 * 
 * @class
 * @name Bookmark
 */
var BookmarkModel = Backbone.Model.extend({
    initialize : function() {
        var bookmark = this.attributes;
        this.set('id', this.getURL(true))
    },
    isValid : function() {
        if (_.any('company username password'.split(' '), function(key) {
            return !this.get(key);
        }, this)) {
            return false;
        }
        if (/^https?:\/\/[^\/]+$/.test(this.get('baseURL'))) {
            return true;
        }
    },
    getURL : function(noPassword) {
        var bookmark = this.attributes;
        var deepLink = bookmark.deepLink ? 'sf/' + bookmark.deepLink : 'login';
        var params = noPassword ? $.param(_.pick(bookmark, 'company', 'username')) : $.param(_.pick(bookmark,
                'company', 'username', 'password'));
        return bookmark.baseURL + '/' + deepLink + '?' + params;
    },
    setURL : function(url) {
        var parts = /^(https?:\/\/[^\/]*)\/(login|sf\/[^\/]*)\?(.*)$/.exec(url);
        if (parts) {
            var deepLink = parts[2];
            if (deepLink == 'login') {
                deepLink = undefined;
            } else {
                deepLink = /sf\/(.*)/.exec(deepLink)[1];
            }
            var query = parts[3];
            var parsed = {}, cursor = 0;
            while (cursor >= 0) {
                var i = query.indexOf('&', cursor);
                if (i == -1) {
                    i = query.length;
                }
                var component = query.substring(cursor, i);
                if (!component) {
                    break;
                }
                var cparts = component.split('=');
                if (cparts.length == 2) {
                    parsed[decodeURIComponent(cparts[0])] = decodeURIComponent(cparts[1]);
                }
                cursor = i+1;
            }
            if (parsed.company && parsed.username && parsed.password) {
                this.set({
                    baseURL : parts[1],
                    deepLink : deepLink,
                    company : parsed.company,
                    username : parsed.username,
                    password : parsed.password
                });
            }
            return true;
        }
        return false;
    },
    getSummary : function() {
        var summary = [];
        var bookmark = this.attributes;
        summary.push(/https?:\/\/([^\.\/]*)/.exec(bookmark.baseURL)[1]);
        if (bookmark.deepLink) {
            summary.push(bookmark.deepLink);
        }
        summary.push(bookmark.company);
        summary.push(bookmark.username);
        return summary.join(' / ');
    }
});

/**
 * This collection of bookmarks will automatically store and retrieve the list
 * from localstorage.
 * 
 * @class
 * @name Bookmarks
 */
var BookmarkCollection = Backbone.Collection.extend({
    model : BookmarkModel,
    initialize : function() {
        this.add(localStorage.storedBookmarks, {
            parse : true
        });
        this.on('change reset add remove sort', _.bind(this.store, this));
    },
    change : function(bookmarkOld, bookmarkNew) {
        if (bookmarkOld) {
            var i = this.indexOf(bookmarkOld);
            this.remove(bookmarkOld);
            this.add(bookmarkNew, {
                at : i
            });
        } else {
            var bookmarkOld = this.get(bookmarkNew.get('id'));
            if (bookmarkOld) {
                this.remove(bookmarkOld);
            }
            this.add(bookmarkNew, {
                at : 0
            });
        }
    },
    parse : function(data) {
        if (typeof data == 'string') {
            try {
                return JSON.parse(data);
            } catch (e) {
            }
        }
    },
    store : function() {
        localStorage.storedBookmarks = JSON.stringify(_.map(this.models, function(m) {
            return _.pick(m.attributes, 'baseURL', 'company', 'username', 'password', 'tags');
        }));
    },
    retrieve : function() {
        return localStorage.storedBookmarks;
    },
    import : function(content) {
        var parsed = this.parse(content);
        if (Array.isArray(parsed)) {
            var cursor = 0;
            parsed.forEach(function(item) {
                var model = new BookmarkModel(item);
                if (model.isValid()) {
                    this.remove(model.get('id'));
                    this.add(model, {
                        at : cursor++
                    });
                }
            }, this);
        }
    }
});