/*global getBlob: true*/
/*global LRU*/
/*global Promise, Blob*/
getBlob =
(function () {
"use strict";

var lru = new LRU(10);

//TODO allow durable offline caching
//use the cache key for details

function getAbout (url) {
	switch (url) {
	case 'about:blank':
		return Promise.resolve({
			data: '<!DOCTYPE html><html></html>',
			type: 'text/html'
		});
	case 'about:help':
		return getUrl('res/modules/about/help.html', 'text/html');
	default:
		return Promise.resolve();
	}
}

function getUrl (url, type) {
	if (url.slice(0, 6) === 'about:') {
		return getAbout(url);
	}
	return new Promise(function (resolve) {
		var xhr = new XMLHttpRequest();
		xhr.open('GET', url);
		xhr.responseType = 'arraybuffer';
		xhr.onload = function () {
			resolve({
				data: xhr.response,
				type: type || xhr.getResponseHeader('Content-Type')
			});
		};
		xhr.onerror = function () {
			resolve();
		};
		try {
			xhr.send();
		} catch (e) {
			xhr.onerror();
		}
	});
}

function getUrlWithCache (url, nocache) {
	var result;
	if (!nocache) {
		result = lru.get(url);
		if (result) {
			return result;
		}
	}
	result = getUrl(url);
	lru.set(url, result);
	return result;
}

function getBlob (url, options) {
	var i, hash = '', xhrUrl, viewsource;
	i = url.indexOf('#');
	if (i > -1) {
		hash = url.slice(i);
		url = url.slice(0, i);
	}
	xhrUrl = url;
	if (xhrUrl.slice(0, 12) === 'view-source:') {
		viewsource = true;
		xhrUrl = xhrUrl.slice(12);
	}
	if (xhrUrl.slice(0, 7) === 'http://' || xhrUrl.slice(0, 8) === 'https://') {
		xhrUrl = options.proxy + xhrUrl;
	}
	return getUrlWithCache(xhrUrl, options.noCache).then(function (result) {
		var type, blobOptions;
		if (!result) {
			return {
				url: url,
				hash: hash,
				blob: new Blob([], {type: 'text/plain'}),
				cache: false,
				error: true
			};
		}
		type = result.type;
		if (!type || type === 'application/xml') {
			if (/\.html?(\?|$)/i.test(url)) {
				type = 'text/html';
			} else if (/\.js(\?|$)/i.test(url)) {
				type = 'text/javascript';
			} else if (/\.css(\?|$)/i.test(url)) {
				type = 'text/css';
			} else if (/\.xml(\?|$)/i.test(url)) {
				type = 'application/xml';
			} else {
				type = '';
			}
		}
		if (viewsource) {
			type = 'text/plain';
		}
		blobOptions = type ? {type: type} : {};
		return {
			url: url, //TODO redirects
			hash: hash,
			blob: new Blob([result.data], blobOptions),
			cache: false
		};
	});
}

return getBlob;
})();