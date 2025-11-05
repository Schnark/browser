/*global Tab: true*/
/*global getBlob, getDoc, getFavicon, logger*/
/*global URL*/
Tab =
(function () {
"use strict";

function Tab (browser, container0, container1) {
	this.browser = browser;
	this.titleBar = document.createElement('div');
	this.icon = document.createElement('img');
	this.icon.width = 20;
	this.icon.height = 20;
	this.icon.alt = '';
	this.icon.hidden = true;
	this.iconUrl = '';
	this.iframe = document.createElement('iframe');
	container0.appendChild(this.icon);
	container0.appendChild(this.titleBar);
	container1.appendChild(this.iframe);
	this.hide();
	this.url = '';
	this.title = 'New tab';
	this.searchEngines = [];
	this.cache = [];
	this.objectUrls = [];
	this.isAborting = false;
	this.isLoading = false;
	this.history = {
		pos: -1,
		entries: []
	};
}

Tab.prototype.show = function () {
	this.icon.style.display = '';
	this.titleBar.style.display = '';
	this.iframe.style.display = '';
	this.iframe.focus();
};

Tab.prototype.hide = function () {
	this.icon.style.display = 'none';
	this.titleBar.style.display = 'none';
	this.iframe.style.display = 'none';
};

Tab.prototype.revokeObjectUrls = function () {
	var i;
	for (i = 0; i < this.objectUrls.length; i++) {
		URL.revokeObjectURL(this.objectUrls[i]);
	}
	this.objectUrls = [];
};

Tab.prototype.setTitle = function (title) {
	this.titleBar.textContent = title;
	this.title = title;
};

Tab.prototype.setIcon = function (icon) {
	if (icon === '...') {
		this.icon.src = 'res/icons/throbber.gif';
		this.iconUrl = '';
	} else {
		this.icon.src = icon;
		this.iconUrl = icon;
	}
	this.icon.hidden = !icon;
};

Tab.prototype.setContent = function (content) {
	this.iframe.src = content;
	this.iframe.focus();
};

Tab.prototype.recordEntry = function (entry, noHistory) {
	this.isLoading = false;
	if (this.isAborting) {
		try {
			this.iframe.contentWindow.stop();
		} catch (e) {
		}
		this.isAborting = false;
		getBlob.abort(false);
	}
	this.browser.record(entry);
	if (!noHistory) {
		if (this.history.pos !== this.history.entries.length - 1) {
			this.history.entries.push(this.history.entries.splice(this.history.pos, 1)[0]);
		}
		this.history.entries.push(entry);
		this.history.pos = this.history.entries.length - 1;
	}
};

Tab.prototype.finalizeLoadUrl = function (icon, entry, options, noHistory) {
	if (options.useIcon && icon) {
		return getFavicon(icon, options).then(function (icon) {
			if (icon) {
				this.setIcon(icon);
				entry.icon = icon;
			} else {
				this.setIcon('');
			}
			this.recordEntry(entry, noHistory);
		}.bind(this));
	} else {
		this.setIcon('');
		this.recordEntry(entry, noHistory);
	}
};

Tab.prototype.loadUrl = function (url, noHistory, noCache) {
	if (this.isLoading) {
		this.abort();
		this.loadingPromise.then(function () {
			this.loadUrl(url, noHistory, noCache);
		}.bind(this));
		return;
	}
	this.isLoading = true;
	if (this.url === url) {
		noHistory = true;
	}
	this.url = url;
	this.setIcon('...');
	logger.log('NAV', url);
	this.revokeObjectUrls();
	this.loadingPromise = this.browser.options.get(url, noCache).then(function (options) {
		return getDoc(url, options).then(function (data) {
			this.setTitle(data.title);
			this.setContent(data.content /*+ data.hash*/);
			this.url = data.url + data.hash;
			this.searchEngines = data.searchEngines;
			this.context = options.context;
			this.cache = data.cache;
			this.objectUrls = data.blobs;
			return this.finalizeLoadUrl(data.icon, {
				title: this.title,
				url: this.url
			}, options, noHistory);
		}.bind(this));
	}.bind(this));
};

Tab.prototype.abort = function () {
	this.isAborting = true;
	getBlob.abort(true);
	try {
		this.iframe.contentWindow.stop();
	} catch (e) {
	}
};

Tab.prototype.reload = function (force) {
	if (this.url) {
		this.loadUrl(this.url, true, force);
	}
};

Tab.prototype.historyBack = function () {
	var url;
	this.history.pos--;
	if (this.history.entries[this.history.pos]) {
		url = this.history.entries[this.history.pos].url;
	}
	if (url) {
		this.loadUrl(url, true);
	}
};

Tab.prototype.historyForward = function () {
	var url;
	this.history.pos++;
	if (this.history.entries[this.history.pos]) {
		url = this.history.entries[this.history.pos].url;
	}
	if (url) {
		this.loadUrl(url, true);
	}
};

Tab.prototype.historyGo = function (index) {
	var url;
	this.history.pos = index;
	if (this.history.entries[this.history.pos]) {
		url = this.history.entries[this.history.pos].url;
	}
	if (url) {
		this.loadUrl(url, true);
	}
};

Tab.prototype.getHistory = function () {
	return this.history;
};

Tab.prototype.destroy = function () {
	this.revokeObjectUrls();
	this.setContent('about:blank');
	this.icon.parentElement.removeChild(this.icon);
	this.titleBar.parentElement.removeChild(this.titleBar);
	this.iframe.parentElement.removeChild(this.iframe);
};

return Tab;
})();