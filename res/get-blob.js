/*global getBlob: true*/
/*global LRU, logger*/
/*global Promise, Blob*/
getBlob =
(function () {
"use strict";

var lru = new LRU(10),
	currentXHR = {},
	isAborting = false;

//TODO allow durable offline caching
//use the cache key for details

function getAbout (url) {
	switch (url) {
	case 'about:blank':
		return Promise.resolve({
			data: '<!DOCTYPE html><html></html>',
			type: 'text/html'
		});
	case 'about:log':
		Promise.resolve().then(function () {
			lru.remove(url);
		});
		return Promise.resolve({
			data: logger.get(),
			type: 'text/plain'
		});
	case 'about:slow':
		return new Promise(
			function (resolve) {
				currentXHR[url] = {
					abort: function () {
						delete currentXHR[url];
						lru.remove(url);
						resolve();
					}
				};
				window.setTimeout(function () {
					delete currentXHR[url];
					resolve({
						data: 'This page takes 5 seconds to load.',
						type: 'text/plain'
					});
				}, 5000);
			}
		);
	case 'about:icon':
		return getUrl('res/icons/icon128.png', 'image/png');
	case 'about:help':
		return getUrl('res/modules/about/help.html', 'text/html');
	default:
		return Promise.resolve();
	}
}

function getUrl (url, type, timeout) {
	if (url.slice(0, 6) === 'about:') {
		return getAbout(url);
	}
	return new Promise(function (resolve) {
		var xhr = new XMLHttpRequest();
		logger.log('GET', url);
		xhr.open('GET', url);
		xhr.responseType = 'arraybuffer';

		function onError () {
			delete currentXHR[url];
			lru.remove(url);
			logger.log('ERROR', url);
			resolve();
		}

		if (timeout) {
			xhr.timeout = timeout;
		}
		xhr.onload = function () {
			delete currentXHR[url];
			logger.log('SUCCESS', url);
			resolve({
				data: xhr.response,
				type: type || xhr.getResponseHeader('Content-Type')
			});
		};
		xhr.onerror = onError;
		xhr.onabort = onError;
		xhr.ontimeout = onError;
		currentXHR[url] = xhr;
		try {
			xhr.send();
		} catch (e) {
			onError();
		}
	});
}

function getUrlWithCache (url, nocache, timeout) {
	var result;
	if (!nocache) {
		result = lru.get(url);
		if (result) {
			logger.log('LRU', url);
			return result;
		}
	}
	if (isAborting) {
		logger.log('SKIP', url);
		return Promise.resolve();
	}
	result = getUrl(url, null, timeout);
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
	return getUrlWithCache(xhrUrl, options.noCache, options.timeout).then(function (result) {
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

function setAbort (abort) {
	//TODO allow selective aborting
	isAborting = abort;
	if (abort) {
		logger.log('ABORT', '');
		Object.keys(currentXHR).forEach(function (url) {
			currentXHR[url].abort();
		});
	}
}

getBlob.abort = setAbort;

return getBlob;
})();