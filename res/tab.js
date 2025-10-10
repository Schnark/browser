/*global Tab: true*/
/*global getDoc*/
/*global URL*/
Tab =
(function () {
"use strict";

function Tab (browser, container0, container1) {
	this.browser = browser;
	this.titleBar = document.createElement('div');
	this.iframe = document.createElement('iframe');
	container0.appendChild(this.titleBar);
	container1.appendChild(this.iframe);
	this.hide();
	this.url = '';
	this.title = 'New tab';
	this.icon = '';
	this.cache = [];
	this.objectUrls = [];
	this.history = {
		pos: -1,
		entries: []
	};
}

Tab.prototype.show = function () {
	this.titleBar.style.display = '';
	this.iframe.style.display = '';
	this.iframe.focus();
};

Tab.prototype.hide = function () {
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

Tab.prototype.setContent = function (content) {
	this.iframe.src = content;
	this.iframe.focus();
};

Tab.prototype.loadUrl = function (url, noHistory, noCache) {
	if (this.url === url) {
		noHistory = true;
	}
	this.url = url;
	this.revokeObjectUrls();
	this.browser.options.get(url, noCache).then(function (options) {
		getDoc(url, options).then(function (data) {
			var entry;
			this.setTitle(data.title);
			this.setContent(data.content /*+ data.hash*/);
			this.url = data.url + data.hash;
			this.icon = data.icon;
			this.cache = data.cache;
			this.objectUrls = data.blobs;
			entry = {
				title: this.title,
				url: this.url
			};
			this.browser.record(entry);
			if (!noHistory) {
				this.history.entries.push(entry);
				this.history.pos = this.history.entries.length - 1;
			}
		}.bind(this));
	}.bind(this));
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
	this.titleBar.parentElement.removeChild(this.titleBar);
	this.iframe.parentElement.removeChild(this.iframe);
};

return Tab;
})();