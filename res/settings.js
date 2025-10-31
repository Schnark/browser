/*global Settings: true*/
/*global getOSD*/
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

function createUrlList (entries, currentIndex, useIcon, buttonData, limit) {
	return entries.map(function (entry, i) {
		var data = 'data-url="' + entry.url.replace(/"/g, '&quot;') + '" data-index="' + i + '"',
			liStart = '<li ' + (i === currentIndex ? 'class="current" ' : '') + data + '>',
			icon = useIcon && entry.icon ? '<img alt="" src="' + entry.icon.replace(/"/g, '&quot;') + '"> ' : '',
			title = '<span class="title">' + entry.title.replace(/</g, '&lt;') + '</span>',
			url = '<span class="url">' + entry.url.replace(/</g, '&lt;') + '</span>',
			button = buttonData ? ' <button title="' + buttonData.title + '" ' +
				'data-action="' + buttonData.action + '" ' + data + '>' + buttonData.text + '</button>' : '';
		if (limit && Math.abs(i - currentIndex) > limit) {
			return '';
		}
		return liStart + icon + title + '<br>' + url + button + '</li>';
	}).join('\n');
}

function getUrlListEl (el) {
	while (el) {
		if (el.dataset.index || el.dataset.url) {
			return el;
		}
		el = el.parentElement;
	}
}

Settings.prototype.el = function (name) {
	return this.container.querySelector('.' + name);
};

Settings.prototype.init = function () {
	this.titleContainer.addEventListener('click', function () {
		if (this.hidden) {
			this.show();
		} else {
			this.hide();
		}
	}.bind(this));

	initSuggestor(this.el('prefs-proxy-url'), this.el('prefs-proxy-url-list'));
	initSuggestor(this.el('prefs-site-proxy-url'), this.el('prefs-site-proxy-url-list'));

	//history buttons
	this.el('history-back').addEventListener('click', function () {
		this.browser.historyBack();
		this.hide();
	}.bind(this));
	this.el('history-forward').addEventListener('click', function () {
		this.browser.historyForward();
		this.hide();
	}.bind(this));
	this.el('history-abort').addEventListener('click', function () {
		this.browser.abort();
		this.hide();
	}.bind(this));
	this.el('history-reload').addEventListener('click', function () {
		this.browser.reload(true);
		this.hide();
	}.bind(this));
	this.el('history-show').addEventListener('click', function () {
		var list = this.el('history-list');
		if (list.hidden) {
			list.hidden = false;
			this.el('bookmark-edit').hidden = true;
			this.el('offline-edit').hidden = true;
		} else {
			list.hidden = true;
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
	//bookmark buttons
	this.el('bookmark-add').addEventListener('click', function () {
		this.browser.addBookmark(this.browser.currentTab.url, this.browser.currentTab.title, this.browser.currentTab.iconUrl);
		this.el('bookmark-add').style.display = 'none';
		this.el('bookmark-remove').style.display = '';
		this.el('bookmark-edit').hidden = false;
		this.el('history-list').hidden = true;
		this.el('offline-edit').hidden = true;
		this.el('bookmark-title').value = this.browser.currentTab.title;
		if (this.browser.currentTab.searchEngines.length) {
			this.el('search-engines-install').innerHTML =
				'<p>' + this.browser.currentTab.searchEngines.map(function (searchEngine) {
					var text = 'Install search engine';
					if (searchEngine.title) {
						text += ': ' + searchEngine.title.replace(/</g, '&lt;');
					}
					return '<button data-url="' + searchEngine.url.replace(/"/g, '&quot;') + '">' + text + '</button>';
				}).join(' ') + '</p>';
		} else {
			this.el('search-engines-install').innerHTML = '';
		}
	}.bind(this));
	this.el('bookmark-title').addEventListener('change', function () {
		this.browser.changeBookmarkTitle(this.browser.currentTab.url, this.el('bookmark-title').value);
	}.bind(this));
	this.el('search-engines-install').addEventListener('click', function (e) {
		var url = e.target.dataset.url;
		if (url) {
			this.installSearchEngine(url, e.target);
		}
	}.bind(this));
	this.el('bookmark-remove').addEventListener('click', function () {
		this.browser.removeBookmark(this.browser.currentTab.url);
		this.el('bookmark-add').style.display = '';
		this.el('bookmark-remove').style.display = 'none';
		this.el('bookmark-edit').hidden = true;
	}.bind(this));
	this.el('offline-status').addEventListener('click', function () {
		var container = this.el('offline-edit');
		if (container.hidden) {
			container.hidden = false;
			this.el('history-list').hidden = true;
			this.el('bookmark-edit').hidden = true;
		} else {
			container.hidden = true;
		}
	}.bind(this));
	//share buttons
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

	//url input
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

	//suggestions
	this.initSuggestions();
	this.el('suggestion-list').addEventListener('click', function (e) {
		var el = getUrlListEl(e.target);
		if (!el) {
			return;
		}
		if (el.dataset.action === 'edit') {
			this.editSuggestions(Number(el.dataset.index));
		} else if (el.dataset.action === 'remove') {
			if (this.suggestions.edit === 1) {
				this.browser.removeHistoryEntry(el.dataset.url);
			} else {
				this.browser.removeSearchEngine(Number(el.dataset.index));
				if (!this.browser.canEditSearchEngines()) {
					this.suggestions.edit = 0;
				}
			}
			this.showSuggestions();
		} else if (el.dataset.action === 'default') {
			this.browser.defaultSearchEngine(Number(el.dataset.index));
			this.showSuggestions();
		} else {
			this.browser.navigate(el.dataset.url);
			this.hide();
		}
	}.bind(this));

	//tab list
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
		if (el.dataset.action === 'remove') {
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

	//prefs
	this.el('prefs').addEventListener('submit', function (e) {
		e.preventDefault();
		this.savePrefs();
		this.browser.reload();
		this.hide();
	}.bind(this));
	this.el('prefs-site').addEventListener('submit', function (e) {
		e.preventDefault();
		this.saveSitePrefs(this.browser.currentTab.url);
		this.browser.reload();
		this.hide();
	}.bind(this));
};

Settings.prototype.showPrefs = function (prefs) {
	this.el('prefs-proxy-url').value = prefs.proxyUrl;
	this.el('prefs-proxy-url').dispatchEvent(new Event('blur'));
	this.el('prefs-cors').checked = prefs.cors;
	this.el('prefs-cert').checked = prefs.cert;
	this.el('prefs-img-media').value = prefs.imgMedia;
	this.el('prefs-dark').checked = prefs.dark;
	this.el('prefs-icon').checked = prefs.useIcon;
};

Settings.prototype.savePrefs = function () {
	var prefs = this.browser.getPrefs();
	prefs.proxyUrl = this.el('prefs-proxy-url').value;
	prefs.cors = this.el('prefs-cors').checked;
	prefs.cert = this.el('prefs-cert').checked;
	prefs.imgMedia = this.el('prefs-img-media').value;
	prefs.dark = this.el('prefs-dark').checked;
	prefs.useIcon = this.el('prefs-icon').checked;
	this.browser.setPrefs(prefs);
};

Settings.prototype.showSitePrefs = function (prefs) {
	this.el('prefs-site-proxy-url').value = prefs.proxyUrl === undefined ? 'about:default' : prefs.proxyUrl;
	this.el('prefs-site-proxy-url').dispatchEvent(new Event('blur'));
	this.el('prefs-site-proxy').checked = prefs.proxy;
	this.el('prefs-site-html').checked = prefs.html !== false;
	this.el('prefs-site-js').checked = prefs.js;
	this.el('prefs-site-css').checked = prefs.css !== false;
	this.el('prefs-site-img-media').value = prefs.imgMedia || '';
	this.el('prefs-site-font').checked = prefs.font;
	this.el('prefs-site-dark').value = prefs.dark === undefined ? '' : (prefs.dark ? '1' : '0');
	this.el('prefs-site-add-css').value = prefs.additionalCSS || '\n';
};

Settings.prototype.saveSitePrefs = function (url) {
	var prefs = {}, value;
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
	value = this.el('prefs-site-add-css').value.trim();
	if (value) {
		prefs.additionalCSS = value;
	}
	this.browser.setPrefs(prefs, url);
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
	this.el('suggestions-edit').addEventListener('click', function () {
		if (this.suggestions.type === 'edit') {
			this.hideSuggestions();
		} else {
			this.suggestions.type = 'edit';
			this.showSuggestions();
		}
	}.bind(this));
};

Settings.prototype.showSuggestions = function (type) {
	var prefs = this.browser.getPrefs(), editOptions, button;
	this.suggestions.type = this.suggestions.type || type || 'top';
	this.el('suggestions-top').classList.remove('selected');
	this.el('suggestions-bookmarks').classList.remove('selected');
	this.el('suggestions-history').classList.remove('selected');
	this.el('suggestions-search').classList.remove('selected');
	this.el('suggestions-edit').classList.remove('selected');
	this.el('suggestions-' + this.suggestions.type).classList.add('selected');
	if (this.suggestions.type === 'edit') {
		editOptions = [
			['Remove history entries', 'Enable buttons to selectively remove history entries'],
			['Select default search engine', 'Allows you to pick the search engine to use by default'],
			['Remove search engines', 'Enable buttons to selectively remove search engines']
		];
		if (!this.browser.canEditSearchEngines()) {
			editOptions.length = 1;
		}
		this.el('suggestion-list').innerHTML = editOptions.map(function (text, i) {
			var edit = i + 1,
				liStart = '<li data-action="edit" data-index="' + edit + '">',
				indicator = this.suggestions.edit === edit ? '◈&nbsp;' : '◇&nbsp;';
			return liStart + '<span class="title">' + indicator + text[0] + '</span><br>' + text[1] + '</li>';
		}.bind(this)).join('\n');
	} else {
		if (this.suggestions.edit === 1) {
			if (this.suggestions.type === 'top' || this.suggestions.type === 'history') {
				button = {title: 'Remove entry', action: 'remove', text: 'X'};
			}
		} else if (this.suggestions.edit === 2) {
			if (this.suggestions.type === 'search') {
				button = {title: 'Select as default', action: 'default', text: '↑'};
			}
		} else if (this.suggestions.edit === 3) {
			if (this.suggestions.type === 'search') {
				button = {title: 'Remove search engine', action: 'remove', text: 'X'};
			}
		}
		this.el('suggestion-list').innerHTML = createUrlList(
			this.browser.getSuggestions(this.suggestions.search, this.suggestions.type),
			-1,
			prefs.useIcon,
			button
		);
	}
	this.el('suggestion-list').style.display = '';
};

Settings.prototype.hideSuggestions = function () {
	this.suggestions = {
		search: '',
		type: '',
		edit: 0
	};
	this.el('suggestions-top').classList.remove('selected');
	this.el('suggestions-bookmarks').classList.remove('selected');
	this.el('suggestions-history').classList.remove('selected');
	this.el('suggestions-search').classList.remove('selected');
	this.el('suggestions-edit').classList.remove('selected');
	this.el('suggestion-list').style.display = 'none';
};

Settings.prototype.editSuggestions = function (edit) {
	if (this.suggestions.edit === edit) {
		this.suggestions.edit = 0;
	} else {
		this.suggestions.edit = edit;
	}
	this.showSuggestions();
};

Settings.prototype.show = function (noFocus) {
	var url = this.browser.currentTab ? this.browser.currentTab.url : '',
		history, isLoading, isBookmark, prefs;
	this.container.classList.add('visible');
	this.titleContainer.classList.add('settings-shown');
	this.hidden = false;
	this.container.scrollTop = 0;
	prefs = this.browser.getPrefs();

	if (url) {
		this.el('history-buttons').style.display = '';
		history = this.browser.currentTab.getHistory();
		this.el('history-back').disabled = history.pos <= 0;
		this.el('history-forward').disabled = history.pos + 1 >= history.entries.length;
		isLoading = this.browser.currentTab.isLoading;
		this.el('history-abort').style.display = isLoading ? '' : 'none';
		this.el('history-reload').style.display = isLoading ? 'none' : '';
		this.el('history-show').disabled = history.entries.length <= 1;
		this.el('history-list').innerHTML = createUrlList(history.entries, history.pos, prefs.useIcon, false, 7);
		isBookmark = this.browser.isBookmark(url);
		this.el('bookmark-add').style.display = isBookmark ? 'none' : '';
		this.el('bookmark-remove').style.display = isBookmark ? '' : 'none';
		this.el('url-browse').disabled = !(/^https?:\/\//.test(url));
	} else {
		this.el('history-buttons').style.display = 'none';
	}
	this.el('history-list').hidden = true;
	this.el('bookmark-edit').hidden = true;
	this.el('offline-edit').hidden = true;

	this.hideSuggestions();

	this.el('url-input').value = url;
	if (!url && !noFocus) {
		this.el('url-input').focus();
	}

	this.el('tab-list').innerHTML = createUrlList(
		this.browser.tabs.map(function (tab) {
			return {
				title: tab.title,
				url: tab.url,
				icon: tab.iconUrl
			};
		}),
		this.browser.tabs.indexOf(this.browser.currentTab), true, {title: 'Close tab', action: 'remove', text: 'X'}
	);

	this.showPrefs(prefs);
	if (url) {
		this.el('prefs-site-container').style.display = '';
		this.el('prefs-site-site').textContent = this.browser.siteFromUrl(url);
		prefs = this.browser.getPrefs(url);
		this.showSitePrefs(prefs);
	} else {
		this.el('prefs-site-container').style.display = 'none';
	}
};

Settings.prototype.hide = function () {
	this.container.classList.remove('visible');
	this.titleContainer.classList.remove('settings-shown');
	this.hidden = true;
};

Settings.prototype.installSearchEngine = function (url, button) {
	button.textContent = 'Please wait …';
	this.browser.options.get(url).then(function (options) {
		getOSD(url, options).then(function (data) {
			if (!data) {
				button.textContent = 'Installing failed';
			} else {
				this.browser.addSearchEngine(data);
				button.textContent = 'Search engine installed';
			}
		}.bind(this));
	}.bind(this));
};

return Settings;
})();