/*global Options: true*/
/*global Promise, Blob, URL*/
Options =
(function () {
"use strict";

function Options (browser) {
	var base;
	this.browser = browser;
	this.fileCache = {};
	base = window.location.href.replace('index.html', 'res/modules/');
	if (
		base.slice(0, 7) === 'file://' ||
		base.slice(0, 7) === 'http://' ||
		base.slice(0, 8) === 'https://'
	) {
		this.getFile = function (path) {
			return Promise.resolve(base + path);
		};
	}
}

Options.prototype.loadFile = function (path, type) {
	return new Promise(function (resolve) {
		var xhr = new XMLHttpRequest();
		xhr.open('GET', 'res/modules/' + path);
		xhr.responseType = 'arraybuffer';
		xhr.onload = function () {
			resolve(URL.createObjectURL(new Blob([xhr.response], {type: type})));
		};
		xhr.onerror = function () {
			resolve('about:invalid');
		};
		xhr.send();
	});
};

Options.prototype.getFile = function (path) {
	var type;
	if (!this.fileCache[path]) {
		if (path.slice(-3) === 'js') {
			type = 'text/javascript';
		} else {
			type = 'text/css';
		}
		this.fileCache[path] = this.loadFile(path, type);
	}
	return this.fileCache[path];
};

Options.prototype.getFiles = function (paths) {
	return Promise.all(paths.map(function (path) {
		return this.getFile(path);
	}.bind(this)));
};

Options.prototype.getPrefs = function (url) {
	var base = this.browser.getPrefs(),
		site = this.browser.getPrefs(url),
		result = {};
	Object.keys(base).forEach(function (key) {
		result[key] = site[key] === undefined ? base[key] : site[key];
	});
	result.img = result.imgMedia.charAt(0) === '1';
	result.manualMedia = result.imgMedia.charAt(1) === '1';
	result.media = result.imgMedia.charAt(2) === '1';
	return result;
};

Options.prototype.getOptions = function (url, noCache) {
	var prefs = this.getPrefs(url),
		defaults = this.browser.getPageDefaults(url),
		mainMode, embedCSS, embedHTML,
		addCSS, addJS;

	if (prefs.cors && defaults.cors && (!prefs.cert || !defaults.cert)) {
		prefs.proxyUrl = '';
	}
	if (prefs.cert && defaults.cert) {
		prefs.proxy = true;
	}

	mainMode = prefs.proxy ? 'proxy' : 'orig';
	embedCSS = prefs.proxy || (!prefs.img || !prefs.font) || prefs.dark;
	embedHTML = embedCSS ||
		(defaults.responsive || !prefs.js || !prefs.css || !prefs.img || !prefs.media || prefs.manualMedia);

	addJS = ['default.js'];
	if (prefs.js) {
		if (defaults.addJS) {
			addJS = addJS.concat(defaults.addJS);
		}
	} else {
		if (defaults.addNoJS) {
			addJS = addJS.concat(defaults.addNoJS);
		}
	}
	if (prefs.css) {
		addCSS = (prefs.dark ? defaults.addDarkCSS || defaults.addCSS : defaults.addCSS) || null;
	} else {
		addCSS = [prefs.dark ? 'default-dark.css' : 'default.css'];
	}
	return {
		proxy: prefs.proxyUrl,
		html: prefs.html ? (defaults.html || (embedHTML ? 'embed' : mainMode)) : 'none',
		js: prefs.js ? (defaults.js || mainMode) : 'none',
		css: prefs.css ? (defaults.css || (embedCSS ? 'embed' : mainMode)) : 'none',
		img: prefs.img ? (defaults.img || mainMode) : 'none',
		media: prefs.media ? (defaults.media || mainMode) : 'none',
		manualMedia: prefs.manualMedia,
		font: prefs.font ? (defaults.font || mainMode) : 'none',
		responsive: defaults.responsive || !prefs.css,
		postget: defaults.postget,
		addCSS: addCSS,
		addJS: addJS,
		dark: prefs.dark,
		noCache: noCache
	};
};

Options.prototype.get = function (url, noCache) {
	var options = this.getOptions(url, noCache);
	return this.getFiles(options.addJS).then(function (addJS) {
		options.addJS = addJS;
		if (options.addCSS) {
			return this.getFiles(options.addCSS).then(function (addCSS) {
				options.addCSS = addCSS;
				return options;
			});
		} else {
			return options;
		}
	}.bind(this));
};

return Options;
})();