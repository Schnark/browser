/*global getBlob: true*/
/*global LRU, logger*/
/*global Promise, Blob*/
getBlob =
(function () {
"use strict";

var lru = new LRU(10);

function getAboutCache (data) {
	function dataToList (data) {
		if (data.length === 0) {
			return '<p>none</p>';
		}
		return '<ul>' + data.map(function (entry) {
			var url = entry[0],
				date = (new Date(entry[1])).toDateString();
			return '<li><a href="' + url.replace(/"/g, '&quot;') + '">' +
				url.replace(/</g, '&lt;') + '</a> (' + date.replace(/</g, '&lt;') + ')</li>';
		}).join('\n') + '</ul>';
	}

	return [
		'<!DOCTYPE html>',
		'<html lang="en"><head>',
		'<meta charset="utf-8">',
		'<title>SparrowSurf Cache</title>',
		'<style>',
		'html {',
			'font: 16px sans-serif;',
		'}',
		'@media (prefers-color-scheme: dark) {',
			'html {',
				'color: #fff;',
				'background: #333;',
			'}',
		'}',
		'</style>',
		'</head><body>',
		'<h1>SparrowSurf Cache</h1>',
		'<h2>Main resources</h2>',
		dataToList(data[0]),
		'<h2>Other resources</h2>',
		dataToList(data[1]),
		'</body></html>'
	].join('\n');
}

function getAbout (url, options) {
	switch (url) {
	case 'about:blank':
		return Promise.resolve(
			new Blob(['<!DOCTYPE html><html></html>'], {type: 'text/html'})
		);
	case 'about:log':
		Promise.resolve().then(function () {
			lru.remove(url);
		});
		return Promise.resolve(
			new Blob([logger.get()], {type: 'text/plain'})
		);
	case 'about:cache':
		return Promise.resolve(
			new Blob([getAboutCache(options.cache.getLists())], {type: 'text/html'})
		);
	case 'about:slow':
		return new Promise(
			function (resolve) {
				if (options.signal) {
					options.signal.addEventListener('abort', function () {
						lru.remove(url);
						logger.log('ERROR', url);
						resolve();
					});
				}
				window.setTimeout(function () {
					resolve(
						new Blob(['This page takes 5 seconds to load.'], {type: 'text/plain'})
					);
				}, 5000);
			}
		);
	case 'about:icon':
		return getUrl('res/icons/icon128.png', options);
	case 'about:help':
		return getUrl('res/modules/about/help.html', options);
	default:
		return Promise.resolve();
	}
}

function getUrl (url, options) {
	if (url.slice(0, 6) === 'about:') {
		return getAbout(url, options);
	}
	return new Promise(function (resolve) {
		var xhr = new XMLHttpRequest();
		logger.log('GET', url);
		xhr.open('GET', url);
		xhr.responseType = 'arraybuffer';

		function onError () {
			lru.remove(url);
			logger.log('ERROR', url);
			resolve();
		}

		if (options.timeout) {
			xhr.timeout = options.timeout;
		}
		xhr.onload = function () {
			var type, blobOptions;
			logger.log('SUCCESS', url);
			type = xhr.getResponseHeader('Content-Type');
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
			blobOptions = type ? {type: type} : {};
			resolve(new Blob([xhr.response], blobOptions));
		};
		xhr.onerror = onError;
		xhr.onabort = onError;
		xhr.ontimeout = onError;
		if (options.signal) {
			options.signal.addEventListener('abort', function () {
				xhr.abort();
			});
		}
		try {
			xhr.send();
		} catch (e) {
			onError();
		}
	});
}

function getUrlWithLRU (url, options) {
	var result;
	if (!options.noCache) {
		result = lru.get(url);
		if (result) {
			logger.log('LRU', url);
			return result;
		}
	}
	if (options.signal && options.signal.aborted) {
		logger.log('SKIP', url);
		return Promise.resolve();
	}
	result = getUrl(url, options);
	lru.set(url, result);
	return result;
}

function prepareBlob (blob, meta) {
	if (meta.store) {
		meta.cache.blob = blob || new Blob([], {type: 'text/plain'});
	}
	if (!blob) {
		return {
			url: meta.url,
			hash: meta.hash,
			blob: new Blob([], {type: 'text/plain'}),
			cache: meta.cache,
			error: true
		};
	}
	if (meta.viewsource) {
		blob = new Blob([blob], {type: 'text/plain'});
	}
	return {
		url: meta.url,
		hash: meta.hash,
		blob: blob,
		cache: meta.cache
	};
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
	if (options.store !== 2 && options.cache.has(xhrUrl)) {
		logger.log('CACHE', xhrUrl);
		return options.cache.getBlob(xhrUrl).then(function (blob) {
			var meta = options.cache.getMeta(xhrUrl);
			return prepareBlob(blob, {
				url: url, //TODO meta.url?
				hash: hash,
				cache: {d: meta.d},
				viewsource: viewsource
			});
		});
	}
	if (xhrUrl.slice(0, 7) === 'http://' || xhrUrl.slice(0, 8) === 'https://') {
		xhrUrl = options.proxy + xhrUrl;
	}
	return getUrlWithLRU(xhrUrl, options).then(function (blob) {
		return prepareBlob(
			blob,
			{
				url: url, //TODO redirects
				hash: hash,
				cache: {d: -1},
				viewsource: viewsource,
				store: options.store
			}
		);
	});
}

return getBlob;
})();