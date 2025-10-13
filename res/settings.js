/*global Settings: true*/
/*global MozActivity, Event*/
Settings =
(function () {
"use strict";

function Settings (browser, container, titleContainer) {
	this.browser = browser;
	this.container = container;
	this.titleContainer = titleContainer;
	this.hidden = true;
	this.init();
}

function supportsShare () {
	return typeof MozActivity !== 'undefined' || navigator.share;
}

function share (url) {
	if (typeof MozActivity !== 'undefined') {
		/*jshint nonew: false*/
		new MozActivity({
			name: 'share',
			data: {type: 'url', url: url, sparrowsurf: 'x'}
		});
	} else {
		navigator.share({url: url});
	}
}

function open (url) {
	if (typeof MozActivity !== 'undefined') {
		/*jshint nonew: false*/
		new MozActivity({
			name: 'view',
			data: {type: 'url', url: url, sparrowsurf: 'x'}
		});
	} else {
		window.open(url, '');
	}
}

function isValidUrl (url) {
	if (url.slice(0, 12) === 'view-source:') {
		url = url.slice(12);
	}
	return url.slice(0, 8) === 'file:///' ||
		url.slice(0, 7) === 'http://' ||
		url.slice(0, 8) === 'https://' ||
		url.slice(0, 5) === 'data:' ||
		url.slice(0, 5) === 'blob:' ||
		url.slice(0, 6) === 'about:';
}

function initSuggestor (input, select) {
	var ignoreBlur = false;
	select.addEventListener('change', function () {
		if (select.value) {
			input.value = select.value;
			input.dispatchEvent(new Event('input'));
			input.style.display = 'none';
		} else {
			input.style.display = '';
			ignoreBlur = true;
			input.focus();
			input.select();
			setTimeout(function () {
				ignoreBlur = false;
			}, 0);
		}
	});
	input.addEventListener('blur', function () {
		if (ignoreBlur) {
			//strange bug, where blur events are fired on number inputs for no apparent reason
			ignoreBlur = false;
			return;
		}
		select.value = input.value;
		if (input.value && (select.value === input.value)) {
			input.style.display = 'none';
		} else {
			select.value = '';
			input.style.display = '';
		}
	});
	input.value = select.value;
	input.style.display = 'none';
}

Settings.prototype.el = function (name) {
	return this.container.querySelector('.' + name);
};

Settings.prototype.init = function () {
	function getUrlListEl (el) {
		while (el) {
			if (el.dataset.index || el.dataset.url) {
				return el;
			}
			el = el.parentElement;
		}
	}

	this.titleContainer.addEventListener('click', function () {
		if (this.hidden) {
			this.show();
		} else {
			this.hide();
		}
	}.bind(this));

	initSuggestor(this.el('prefs-proxy-url'), this.el('prefs-proxy-url-list'));
	initSuggestor(this.el('prefs-site-proxy-url'), this.el('prefs-site-proxy-url-list'));

	this.el('history-back').addEventListener('click', function () {
		this.browser.historyBack();
		this.hide();
	}.bind(this));
	this.el('history-forward').addEventListener('click', function () {
		this.browser.historyForward();
		this.hide();
	}.bind(this));
	this.el('history-reload').addEventListener('click', function () {
		this.browser.reload(true);
		this.hide();
	}.bind(this));
	this.el('history-show').addEventListener('click', function () {
		var list = this.el('history-list');
		if (list.style.display === 'none') {
			list.style.display = '';
		} else {
			list.style.display = 'none';
		}
	}.bind(this));
	this.el('history-list').addEventListener('click', function (e) {
		var el = getUrlListEl(e.target);
		if (!el) {
			return;
		}
		this.browser.historyGo(Number(el.dataset.index));
		this.hide();
	}.bind(this));
	this.el('bookmark-add').addEventListener('click', function () {
		//TODO allow changing the title
		this.browser.addBookmark(this.browser.currentTab.url, this.browser.currentTab.title);
		this.el('bookmark-add').style.display = 'none';
		this.el('bookmark-remove').style.display = '';
	}.bind(this));
	this.el('bookmark-remove').addEventListener('click', function () {
		this.browser.removeBookmark(this.browser.currentTab.url);
		this.el('bookmark-add').style.display = '';
		this.el('bookmark-remove').style.display = 'none';
	}.bind(this));
	if (supportsShare()) {
		this.el('url-share').addEventListener('click', function () {
			share(this.browser.currentTab.url);
		}.bind(this));
	} else {
		this.el('url-share').disabled = true;
	}
	this.el('url-browse').addEventListener('click', function () {
		open(this.browser.currentTab.url);
	}.bind(this));

	this.el('url-input').addEventListener('focus', function () {
		this.select();
	});
	this.el('url-form').addEventListener('submit', function (e) {
		var url;
		e.preventDefault();
		url = this.el('url-input').value;
		if (!isValidUrl(url)) {
			if (/[a-z\.\-]+\.[a-z]{2,3}(?:\/\S*)?$/i.test(url)) {
				url = 'https://' + url;
			} else {
				url = this.browser.getSuggestions(url, 'search')[0].url;
			}
		}
		this.browser.navigate(url);
		this.hide();
	}.bind(this));

	this.initSuggestions();

	this.el('suggestion-list').addEventListener('click', function (e) {
		var el = getUrlListEl(e.target);
		if (!el) {
			return;
		}
		this.browser.navigate(el.dataset.url);
		this.hide();
	}.bind(this));

	this.el('new-tab').addEventListener('click', function () {
		this.browser.openNewTab();
		this.show();
	}.bind(this));

	this.el('tab-list').addEventListener('click', function (e) {
		var el = getUrlListEl(e.target), index;
		if (!el) {
			return;
		}
		index = Number(el.dataset.index);
		if (el.dataset.action === 'close') {
			this.browser.destroyTab(index);
			this.show();
		} else {
			this.browser.showTab(index);
			if (this.browser.currentTab.url) {
				this.hide();
			} else {
				this.show();
			}
		}
	}.bind(this));

	this.el('prefs').addEventListener('submit', function (e) {
		var prefs = this.browser.getPrefs();
		e.preventDefault();
		prefs.proxyUrl = this.el('prefs-proxy-url').value;
		prefs.cors = this.el('prefs-cors').checked;
		prefs.cert = this.el('prefs-cert').checked;
		prefs.imgMedia = this.el('prefs-img-media').value;
		prefs.dark = this.el('prefs-dark').checked;
		this.browser.setPrefs(prefs);
		this.browser.reload();
		this.hide();
	}.bind(this));

	this.el('prefs-site').addEventListener('submit', function (e) {
		var url = this.browser.currentTab.url,
			prefs = {}, value;
		e.preventDefault();
		value = this.el('prefs-site-proxy-url').value;
		if (value !== 'about:default') {
			prefs.proxyUrl = value;
		}
		value = this.el('prefs-site-proxy').checked;
		if (value) {
			prefs.proxy = true;
		}
		value = this.el('prefs-site-html').checked;
		if (!value) {
			prefs.html = false;
		}
		value = this.el('prefs-site-js').checked;
		if (value) {
			prefs.js = true;
		}
		value = this.el('prefs-site-css').checked;
		if (!value) {
			prefs.css = false;
		}
		value = this.el('prefs-site-img-media').value;
		if (value) {
			prefs.imgMedia = value;
		}
		value = this.el('prefs-site-font').checked;
		if (value) {
			prefs.font = true;
		}
		value = this.el('prefs-site-dark').value;
		if (value) {
			prefs.dark = value === '1';
		}
		this.browser.setPrefs(prefs, url);
		this.browser.reload();
		this.hide();
	}.bind(this));
};

Settings.prototype.initSuggestions = function () {
	this.hideSuggestions();
	this.el('url-input').addEventListener('focus', function () {
		this.showSuggestions();
	}.bind(this));
	this.el('url-input').addEventListener('input', function () {
		this.suggestions.search = this.el('url-input').value;
		this.showSuggestions();
	}.bind(this));
	this.el('suggestions-top').addEventListener('click', function () {
		if (this.suggestions.type === 'top') {
			this.hideSuggestions();
		} else {
			this.suggestions.type = 'top';
			this.showSuggestions();
		}
	}.bind(this));
	this.el('suggestions-bookmarks').addEventListener('click', function () {
		if (this.suggestions.type === 'bookmarks') {
			this.hideSuggestions();
		} else {
			this.suggestions.type = 'bookmarks';
			this.showSuggestions();
		}
	}.bind(this));
	this.el('suggestions-history').addEventListener('click', function () {
		if (this.suggestions.type === 'history') {
			this.hideSuggestions();
		} else {
			this.suggestions.type = 'history';
			this.showSuggestions();
		}
	}.bind(this));
	this.el('suggestions-search').addEventListener('click', function () {
		if (this.suggestions.type === 'search') {
			this.hideSuggestions();
		} else {
			this.suggestions.type = 'search';
			this.showSuggestions();
		}
	}.bind(this));
};

Settings.prototype.showSuggestions = function (type) {
	this.suggestions.type = this.suggestions.type || type || 'top';
	this.el('suggestions-top').classList.remove('selected');
	this.el('suggestions-bookmarks').classList.remove('selected');
	this.el('suggestions-history').classList.remove('selected');
	this.el('suggestions-search').classList.remove('selected');
	this.el('suggestions-' + this.suggestions.type).classList.add('selected');
	this.el('suggestion-list').innerHTML = this.browser.getSuggestions(
		this.suggestions.search,
		this.suggestions.type
	).map(function (suggestion) {
		var liStart = '<li data-url="' + suggestion.url.replace(/"/g, '&quot;') + '">',
			title = '<span class="title">' + suggestion.title.replace(/</g, '&lt;') + '</span>',
			url = '<span class="url">' + suggestion.url.replace(/</g, '&lt;') + '</span>';
		return liStart + title + '<br>' + url + '</li>';
	}).join('\n');
	this.el('suggestion-list').style.display = '';
};

Settings.prototype.hideSuggestions = function () {
	this.suggestions = {
		search: '',
		type: ''
	};
	this.el('suggestions-top').classList.remove('selected');
	this.el('suggestions-bookmarks').classList.remove('selected');
	this.el('suggestions-history').classList.remove('selected');
	this.el('suggestions-search').classList.remove('selected');
	this.el('suggestion-list').style.display = 'none';
};

Settings.prototype.show = function (noFocus) {
	var url = this.browser.currentTab ? this.browser.currentTab.url : '',
		history, isBookmark, prefs;
	this.container.classList.add('visible');
	this.titleContainer.classList.add('settings-shown');
	this.hidden = false;
	this.container.scrollTop = 0;

	if (url) {
		this.el('history-buttons').style.display = '';
		history = this.browser.currentTab.getHistory();
		this.el('history-back').disabled = history.pos <= 0;
		this.el('history-forward').disabled = history.pos + 1 >= history.entries.length;
		this.el('history-show').disabled = history.entries.length <= 1;
		this.el('history-list').innerHTML = history.entries.map(function (entry, i) {
			var liStart = '<li ' + (i === history.pos ? 'class="current" ' : '') + 'data-index="' + i + '">',
				title = '<span class="title">' + entry.title.replace(/</g, '&lt;') + '</span>',
				url = '<span class="url">' + entry.url.replace(/</g, '&lt;') + '</span>';
			return Math.abs(i - history.pos) <= 7 ? liStart + title + '<br>' + url + '</li>' : '';
		}).join('\n');
		this.el('history-list').style.display = 'none';
		isBookmark = this.browser.isBookmark(url);
		this.el('bookmark-add').style.display = isBookmark ? 'none' : '';
		this.el('bookmark-remove').style.display = isBookmark ? '' : 'none';
	} else {
		this.el('history-buttons').style.display = 'none';
	}
	this.hideSuggestions();

	this.el('url-input').value = url;
	if (!url && !noFocus) {
		this.el('url-input').focus();
	}

	this.el('tab-list').innerHTML = this.browser.tabs.map(function (tab, i) {
		var liStart = '<li ' + (tab === this.browser.currentTab ? 'class="current" ' : '') + 'data-index="' + i + '">',
			title = '<span class="title">' + tab.title.replace(/</g, '&lt;') + '</span>',
			url = '<span class="url">' + tab.url.replace(/</g, '&lt;') + '</span>',
			button = '<button title="Close tab" data-action="close" data-index="' + i + '">X</button>';
		return liStart + title + '<br>' + url + ' ' + button + '</li>';
	}.bind(this)).join('\n');

	prefs = this.browser.getPrefs();
	this.el('prefs-proxy-url').value = prefs.proxyUrl;
	this.el('prefs-proxy-url').dispatchEvent(new Event('blur'));
	this.el('prefs-cors').checked = prefs.cors;
	this.el('prefs-cert').checked = prefs.cert;
	this.el('prefs-img-media').value = prefs.imgMedia;
	this.el('prefs-dark').checked = prefs.dark;

	if (url) {
		this.el('prefs-site-container').style.display = '';
		this.el('prefs-site-site').textContent = this.browser.siteFromUrl(url);
		prefs = this.browser.getPrefs(url);
		this.el('prefs-site-proxy-url').value = prefs.proxyUrl === undefined ? 'about:default' : prefs.proxyUrl;
		this.el('prefs-site-proxy-url').dispatchEvent(new Event('blur'));
		this.el('prefs-site-proxy').checked = prefs.proxy;
		this.el('prefs-site-html').checked = prefs.html !== false;
		this.el('prefs-site-js').checked = prefs.js;
		this.el('prefs-site-css').checked = prefs.css !== false;
		this.el('prefs-site-img-media').value = prefs.imgMedia || '';
		this.el('prefs-site-font').checked = prefs.font;
		this.el('prefs-site-dark').value = prefs.dark === undefined ? '' : (prefs.dark ? '1' : '0');
	} else {
		this.el('prefs-site-container').style.display = 'none';
	}
};

Settings.prototype.hide = function () {
	this.container.classList.remove('visible');
	this.titleContainer.classList.remove('settings-shown');
	this.hidden = true;
};

return Settings;
})();