/*global Browser: true*/
/*global Storage, Options, Tab, Settings, Modules, MODULES*/
Browser =
(function () {
"use strict";

function Browser (container) {
	this.container = container;
	this.titleContainer = container.querySelector('.titlebar');
	this.tabContainer = container.querySelector('.tabs');
	this.settings = new Settings(this, container.querySelector('.settings'), this.titleContainer);
	this.tabs = [];
	this.currentTab = null;
	this.storage = new Storage('sparrow-surf-');
	this.loadPrefs();
	this.loadBookmarksHistory();
	this.options = new Options(this);
	this.modules = new Modules(MODULES);
	window.addEventListener('message', function (e) {
		var data = e.data;
		this.navigate(data.url, data.target);
	}.bind(this));
}

Browser.prototype.loadPrefs = function () {
	this.prefs = this.storage.load('prefs', {
		'': {
				proxyUrl: '',
				cors: true,
				cert: true,
				proxy: false,
				html: true,
				js: false,
				css: true,
				imgMedia: '111',
				font: false,
				dark: false,
				welcome: 0, //version of welcome page shown
				v: 1 //version of prefs
		}
	});
	if (this.prefs[''].dark) {
		this.container.className = 'dark-mode';
	}
};

Browser.prototype.storePrefs = function () {
	this.storage.save('prefs', this.prefs);
};

Browser.prototype.siteFromUrl = function (url) {
	return url.replace(/^([^\/]*\/\/[^\/]*)\/.*$/, '$1');
};

Browser.prototype.getPrefs = function (url) {
	return this.prefs[this.siteFromUrl(url || '')] || {};
};

Browser.prototype.setPrefs = function (prefs, url) {
	this.prefs[this.siteFromUrl(url || '')] = prefs;
	this.container.className = this.prefs[''].dark ? 'dark-mode' : '';
	this.storePrefs();
};

Browser.prototype.getPageDefaults = function (url) {
	return this.modules.getDefaults(url);
};

Browser.prototype.loadBookmarksHistory = function () {
	this.bookmarks = this.storage.load('bookmarks', [
		{url: 'about:help', title: 'SparrowSurf Help'}
	]);
	this.visitedPages = this.storage.load('history', []);
	this.searchEngines = this.storage.load('search', [
		{url: 'https://html.duckduckgo.com/html/?q=%s', title: 'DuckDuckGo'}
		//{url: 'https://www.ecosia.org/search?q=%s', title: 'Ecosia'} doesn't work (yet)
		//{url: 'https://www.google.com/search?q=%s', title: 'Google'} requires cookies
		//TODO more
	]);
};

Browser.prototype.storeBookmarks = function () {
	this.storage.save('bookmarks', this.bookmarks);
};

Browser.prototype.storeHistory = function () {
	this.storage.save('history', this.visitedPages);
};

//TODO allow editing search engines

Browser.prototype.record = function (entry) {
	var i, data, now;
	for (i = 0; i < this.visitedPages.length; i++) {
		if (this.visitedPages[i].url === entry.url) {
			break;
		}
	}
	if (i === this.visitedPages.length) {
		this.visitedPages.unshift({
			url: entry.url,
			title: entry.title,
			d: Date.now(),
			n: 1
		});
	} else {
		data = this.visitedPages.splice(i, 1)[0];
		data.title = entry.title;
		data.d = Date.now();
		data.n++;
		this.visitedPages.unshift(data);
	}

	//TODO better trimming
	if (this.visitedPages.length > 1000) {
		now = Date.now();
		for (i = this.visitedPages.length - 1; i >= 0; i--) {
			if (this.visitedPages[i].d > now - 1000 * 60 * 60 * 24) {
				break;
			}
			if (
				this.visitedPages[i].n <= 5 &&
				this.visitedPages[i].n < (now - this.visitedPages[i].d) / (1000 * 60 * 60 * 24)
			) {
				this.visitedPages.splice(i, 1);
				break;
			}
		}
	}

	this.storeHistory();
};

Browser.prototype.isBookmark = function (url) {
	var i;
	for (i = 0; i < this.bookmarks.length; i++) {
		if (this.bookmarks[i].url === url) {
			return true;
		}
	}
	return false;
};

Browser.prototype.addBookmark = function (url, title) {
	this.removeBookmark(url, true);
	this.bookmarks.unshift({url: url, title: title});
	this.storeBookmarks();
};

Browser.prototype.removeBookmark = function (url, noStore) {
	var i;
	for (i = 0; i < this.bookmarks.length; i++) {
		if (this.bookmarks[i].url === url) {
			this.bookmarks.splice(i, 1);
			if (!noStore) {
				this.storeBookmarks();
			}
			return;
		}
	}
};

Browser.prototype.getSuggestions = function (search, type) {
	var list;

	if (type === 'search') {
		search = encodeURIComponent(search);
		return this.searchEngines.map(function (engine) {
			return {
				url: engine.url.replace('%s', search),
				title: engine.title
			};
		});
	}

	search = search.toLowerCase();

	if (type === 'bookmarks') {
		list = this.bookmarks;
	} else {
		list = this.visitedPages;
	}

	list = list.filter(function (entry) {
		return entry.url.toLowerCase().indexOf(search) > -1 || entry.title.toLowerCase().indexOf(search) > -1;
	});

	if (type === 'top') {
		list.sort(function (a, b) {
			return b.n - a.n;
		});
		if (list.length > 20) {
			list.length = 20;
		}
	} else if (type === 'history') {
		/*list.sort(function (a, b) {
			return b.d - a.d;
		});*/
		if (list.length > 20) {
			list.length = 20;
		}
	}

	return list;
};

Browser.prototype.createTab = function () {
	var tab = new Tab(this, this.titleContainer, this.tabContainer);
	//TODO place behind currentTab?
	this.tabs.push(tab);
	return tab;
};

Browser.prototype.destroyTab = function (index) {
	if (index === -1) {
		if (!this.currentTab) {
			return;
		}
		index = this.tabs.indexOf(this.currentTab);
	}
	if (this.tabs[index] === this.currentTab) {
		this.currentTab = index > 0 ? this.tabs[index - 1] : (this.tabs[1] || null);
		if (this.currentTab) {
			this.currentTab.show();
		}
	}
	this.tabs[index].destroy();
	this.tabs.splice(index, 1);
};

Browser.prototype.showTab = function (tab) {
	if (typeof tab === 'number') {
		tab = this.tabs[tab];
	}
	if (this.currentTab) {
		this.currentTab.hide();
	}
	this.currentTab = tab;
	this.currentTab.show();
};

Browser.prototype.openNewTab = function () {
	this.showTab(this.createTab());
};

Browser.prototype.navigate = function (url, target) {
	target = target || '_self';
	//TODO handle all targets
	if (!this.currentTab || target !== '_self') {
		this.openNewTab();
	}
	if (/^https?:\/\/[^\/]+$/.test(url)) {
		url = url + '/';
	}
	this.currentTab.loadUrl(url);
};

Browser.prototype.reload = function (force) {
	if (this.currentTab) {
		this.currentTab.reload(force);
	}
};

Browser.prototype.historyBack = function () {
	if (this.currentTab) {
		this.currentTab.historyBack();
	}
};

Browser.prototype.historyForward = function () {
	if (this.currentTab) {
		this.currentTab.historyForward();
	}
};

Browser.prototype.historyGo = function (index) {
	if (this.currentTab) {
		this.currentTab.historyGo(index);
	}
};

Browser.prototype.showBookmarks = function () {
	this.settings.show(true);
	this.settings.showSuggestions('bookmarks');
};

return Browser;
})();