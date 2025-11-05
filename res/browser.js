/*global Browser: true*/
/*global Storage, Options, ContextMenu, getBlob, Tab, Settings, Modules, MODULES*/
/*global URL*/
Browser =
(function () {
"use strict";

//jscs:disable maximumLineLength
var SPARROWSURFICON = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAA5ElEQVQ4jWN49+7df2piBrobqHroz3+G3f//M+z+/1/10B/yDYQZggsTbeD6B58JGgbD6x98JmwgsYbhcikDsYYx7/73/+7du//v3r2L11CiDYQZdvX2vf9N518TNhA5NpEx796/cMNgmH8vqlrk2GfA57p5l59hGKZ64CfesMRpILpBuMIPp4EwL+My6O7du/9P37qP1TCsXiYUKXtuPILE9pYn/wVmtf3nWTif/FiW7HT+r1TO8F+xgvU/y8bbcHHhKXn4DXz37t1/pXIGFCxfLUh+wqZJ1qN64UCz4otcTHUDAcpGMYiFNMTHAAAAAElFTkSuQmCC',
DUCKDUCKGOICON = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAADF0lEQVQ4jdXU32vVdRzHcf+BrkQQCcGGKMTUbXQm2Ahy+SuDEWZnW3CgVYMTLSbbWVHOaUhtywki/ZDoIghm9oPmmszNwzacnrPT3Fx1nPt+z4/v+Z4f39872+mcne/OsWcXIhLHzIsu6gPv2wdv3u/P673Gsiz+zVrz/wTNhExy6BuELjfC4Wqiz29jvqEG4WgTysQlzFQKyzQfATRNtNkAcm8remcTGZ+XgqlT1BTspEQueJP0mfeRe4+g3biOZRgPB7WbAaS2erLDF8hLYTLXL6OebEHcvp5w7Wb0c73kY1Hyfi+ypwFlavzvQVNRSPS1s3JtmOXRQcI1G1n87lNWgdz0JDHnLkK7yxB3bWB5dID8xCDx3laMiPBgULk6gnW6A1uWEKvXk+zuIM/9l4vcQn7zBcQDWxCfeZxscI6l7hZSF7/GNPRSUDj6GtngLMYXPUTqHKiSxMxtHcP6nTt/QCBRYLbNTXT/kwjPbkbpe49cYBy5rwNDUUrBYP3T2MkY4b1biLn2oKezjAckgqIFwI8zCr6+LvT2p5Dd5UgvOygYGtLbdZipZCkYOVhOMW2xULGWqKuWpbjMUtYmtyRyJ/I5zH5CbuBV0l9WoXVXIjjWUtBUEu69mKlEKbhwqJrCooHk3EnokANl+MLd4S0PUhx5DPN4GVpXOcaZSiL1FYSe24odjyB5nBgP6nChq5mMz4t69hjC7ieIn3r3Lli0sGfOYn60nUx3Jeo7VYT2l6F99iH27V+Re45gpFKlYGLoPEZnEyvCPKJjHVLzi9j3VhxKYDXW0n+sAr9rBxHHBlbCAtlzJ1DHhv6Smvv/MC4j97SSHf2ezMhF4vuq8PnP47rhonGsjn39O9jq3cYPhzdhDw5g/zxG/OM2dDn6kKTMTSF5nOSuXqKoKPwiTtI45eQVXz1ffevmgyst3JJnWPUOIHsaUP0TJZkuzfLcFPKpdhZPe0j/Nk1KFckUMqxm0pj+K2jH3yB28i206Wv/nOV7ZahJ1MnLhDpfZ76hBulgOcJLOxE6m0n+1I8uRx7x2vwXD+yfmW1cnUhf3xoAAAAASUVORK5CYII=';
//jscs:enable maximumLineLength

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
	this.contextMenu = new ContextMenu(container.querySelector('.context-menu'));
	this.modules = new Modules(MODULES);
	window.addEventListener('message', function (e) {
		this.onMessage(e.data);
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
				additionalCSS: '',
				useIcon: false,
				welcome: 0, //version of welcome page shown
				v: 2 //version of prefs
		}
	});
	if (this.prefs[''].v === 1) {
		this.prefs[''].v = 2;
		this.prefs[''].additionalCSS = '';
		this.storePrefs();
	}
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
		{url: 'about:help', title: 'SparrowSurf Help', icon: SPARROWSURFICON}
	]);
	this.visitedPages = this.storage.load('history', []);
	this.searchEngines = this.storage.load('search', [
		{url: 'https://html.duckduckgo.com/html/?q=%s', title: 'DuckDuckGo', icon: DUCKDUCKGOICON}
		//{url: 'https://www.ecosia.org/search?q=%s', title: 'Ecosia'} doesn't work (yet)
		//{url: 'https://www.google.com/search?q=%s', title: 'Google'} requires cookies
		//TODO more
		//to add a new search engine for all users, increment the prefs version and add it for all
		//users of a lower version
	]);
};

Browser.prototype.storeBookmarks = function () {
	this.storage.save('bookmarks', this.bookmarks);
};

Browser.prototype.storeHistory = function () {
	this.storage.save('history', this.visitedPages);
};

Browser.prototype.storeSearchEngines = function () {
	this.storage.save('search', this.searchEngines);
};

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
			icon: entry.icon,
			d: Date.now(),
			n: 1
		});
	} else {
		data = this.visitedPages.splice(i, 1)[0];
		data.title = entry.title;
		data.icon = entry.icon || data.icon;
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

Browser.prototype.removeHistoryEntry = function (url) {
	var i;
	for (i = 0; i < this.visitedPages.length; i++) {
		if (this.visitedPages[i].url === url) {
			this.visitedPages.splice(i, 1);
			this.storeHistory();
			return;
		}
	}
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

Browser.prototype.addBookmark = function (url, title, icon) {
	this.removeBookmark(url, true);
	this.bookmarks.unshift({url: url, title: title, icon: icon});
	this.storeBookmarks();
};

Browser.prototype.changeBookmarkTitle = function (url, title) {
	var i;
	for (i = this.bookmarks.length - 1; i >= 0; i--) {
		if (this.bookmarks[i].url === url) {
			this.bookmarks[i].title = title;
			this.storeBookmarks();
			return;
		}
	}
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

Browser.prototype.canEditSearchEngines = function () {
	return this.searchEngines.length >= 2;
};

Browser.prototype.addSearchEngine = function (searchEngine) {
	var i;
	for (i = 0; i < this.searchEngines.length; i++) {
		if (this.searchEngines[i].url === searchEngine.url) {
			//only add icon for search engine already in the list
			if (!this.searchEngines[i].icon && searchEngine.icon) {
				this.searchEngines[i].icon = searchEngine.icon;
				this.storeSearchEngines();
			}
			return;
		}
	}
	this.searchEngines.push(searchEngine);
	this.storeSearchEngines();
};

Browser.prototype.removeSearchEngine = function (index) {
	this.searchEngines.splice(index, 1);
	this.storeSearchEngines();
};

Browser.prototype.defaultSearchEngine = function (index) {
	var search = this.searchEngines.splice(index, 1)[0];
	this.searchEngines.unshift(search);
	this.storeSearchEngines();
};

Browser.prototype.getSuggestions = function (search, type) {
	var list;

	if (type === 'search') {
		search = encodeURIComponent(search);
		return this.searchEngines.map(function (engine) {
			return {
				url: engine.url.replace('%s', search),
				title: engine.title,
				icon: engine.icon
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

Browser.prototype.showContextMenu = function (data, callback) {
	this.contextMenu.show(data.map(function (entry) {
		return entry.text;
	}), function (i) {
		callback(data[i]);
	});
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

Browser.prototype.download = function (url, name) {
	name = name || url.replace(/\/+$/, '').replace(/^.*\//, '');
	this.options.get(url).then(function (options) {
		getBlob(url, options).then(function (result) {
			var a;
			if (result.error) {
				return;
			}
			url = URL.createObjectURL(result.blob);
			a = document.createElement('a');
			a.href = url;
			a.target = '_blank';
			a.download = name;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			window.setTimeout(function () {
				URL.revokeObjectURL(url);
			}, 10000);
		});
	});
};

Browser.prototype.abort = function () {
	if (this.currentTab) {
		this.currentTab.abort();
	}
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

Browser.prototype.onMessage = function (data) {
	var currentUrl, contextMenuEntries, extraContext;
	if (data.type === 'navigate') {
		this.navigate(data.url, data.target);
		return;
	}
	if (data.type === 'download') {
		this.download(data.url, data.name);
		return;
	}
	//data.type === 'context-menu'
	contextMenuEntries = [];
	data.context.forEach(function (entry) {
		var media;
		switch (entry.type) {
		case 'a':
			contextMenuEntries.push({
				text: 'Open link in a new tab',
				url: entry.url
			});
			if (/.pdf(?:#|$)/i.test(entry.url)) {
				contextMenuEntries.push({
					text: 'Download link target',
					url: entry.url,
					download: true
				});
			}
			break;
		case 'img':
		case 'audio':
		case 'video':
			media = {
				img: 'image',
				audio: 'audio file',
				video: 'video'
			}[entry.type];
			contextMenuEntries.push({
				text: 'Open ' + media + ' in a new tab',
				url: entry.url
			});
			contextMenuEntries.push({
				text: 'Download ' + media,
				url: entry.url,
				download: true
			});
		}
	});
	currentUrl = this.currentTab.url;
	extraContext = this.currentTab.context;
	Object.keys(extraContext).forEach(function (re) {
		var result = (new RegExp(re)).exec(currentUrl);
		if (result) {
			contextMenuEntries.push({
				text: extraContext[re][0],
				url: extraContext[re][1].replace(/\$(\d+)/g, function (all, index) {
					return result[index];
				})
			});
		}
	});
	contextMenuEntries.push({
		text: 'Show HTML source',
		url: 'view-source:' + currentUrl
	});
	this.showContextMenu(contextMenuEntries, function (data) {
		if (data.download) {
			this.download(data.url);
		} else {
			this.navigate(data.url, '_blank');
		}
	}.bind(this));
};

return Browser;
})();