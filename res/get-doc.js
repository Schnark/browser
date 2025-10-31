/*global getDoc: true*/
/*global getBlob, modify*/
/*global Promise, Blob, URL*/
getDoc =
(function () {
"use strict";

function getType (data) {
	var type, i;
	if (data.error) {
		return 'error';
	}
	type = data.blob.type;
	i = type.indexOf(';');
	if (i > -1) {
		type = type.slice(0, i).trim();
	}
	if (type === 'text/html') {
		return 'html';
	}
	if (type === 'text/css') {
		return 'css';
	}
	if (type === 'text/plain') {
		return 'text';
	}
	return 'other';
}

function getPrefix (text) {
	var prefix = 'inline-a';
	while (text.indexOf(prefix) > -1) {
		prefix += Math.floor(Math.random() * 10);
	}
	prefix += ':';
	return prefix;
}

function getMainFavicon (url) {
	var i;
	if (url.slice(0, 6) === 'about:') {
		return 'about:icon';
	}
	if (url.slice(0, 7) !== 'http://' && url.slice(0, 8) !== 'https://') {
		return '';
	}
	i = url.indexOf('/', 9);
	if (i === -1) {
		return '';
	}
	return url.slice(0, i) + '/favicon.ico';
}

function getTitleFromUrl (url) {
	var title = url.replace(/(\?|#).*$/, '').replace(/^.*\//, '');
	if (!title || title.slice(0, 6) === 'index.') {
		title = url.replace(/(\?|#).*$/, '').replace(/^.*\/([^\/]*\/)/, '$1');
	}
	return title;
}

function blobToText (blob) {
	return new Promise(function (resolve) {
		var reader = new FileReader();
		reader.onloadend = function () {
			resolve(reader.result);
		};
		reader.readAsText(blob); //TODO encoding
	});
}

function getDocs (urls, options, track, i) {
	i = i || 0;
	if (urls.length === i) {
		return Promise.resolve([]);
	}
	return getDocOrError(urls[i], options, track).then(function (doc) {
		return getDocs(urls, options, track, i + 1).then(function (docs) {
			docs.unshift(doc);
			return docs;
		});
	});
}

function inlineUrls (data, prefix, options, track) {
	return getDocs(data.urls, options, track).then(function (docs) {
		var result = {
			blobs: [],
			cache: []
		}, i;
		for (i = 0; i < docs.length; i++) {
			result.blobs = result.blobs.concat(docs[i].blobs);
			result.cache = result.cache.concat(docs[i].cache);
		}
		result.text = data.text.replace(new RegExp(prefix + '(\\d+)', 'g'), function (all, i) {
			return docs[i].content;
		});
		return result;
	});
}

function getHTML (data, options, track) {
	return blobToText(data.blob).then(function (html) {
		var prefix = getPrefix(html),
			doc = (new DOMParser()).parseFromString(html, 'text/html'),
			urls,
			icon,
			searchEngines;
		//TODO optionally set data.url to canonical url, like <meta property="og:url" content=""> etc.
		urls = modify.html(doc, data.url, prefix, options);

		icon = doc.querySelectorAll('link[rel~="icon"][href]');
		if (icon.length) {
			icon = icon[0].href; //TODO pick best icon
		} else {
			icon = '';
		}
		searchEngines = [].map.call(
			doc.querySelectorAll('link[rel="search"][type="application/opensearchdescription+xml"][href]'),
			function (el) {
				return {url: el.href, title: el.title || ''};
			}
		);

		html = '\uFEFF' + (new XMLSerializer()).serializeToString(doc);
		return inlineUrls({
			text: html,
			urls: urls
		}, prefix, options, track).then(function (result) {
			var file = getFile(
				{
					url: data.url,
					hash: data.hash,
					blob: new Blob([result.text], {type: 'text/html'}),
					cache: data.cache
				}, options
			);
			file.blobs = file.blobs.concat(result.blobs);
			file.cache = file.cache.concat(result.cache);
			file.title = doc.title || file.title;
			file.icon = icon || file.icon;
			file.searchEngines = searchEngines;
			return file;
		});
	});
}

function getCSS (data, options, track) {
	return blobToText(data.blob).then(function (css) {
		var prefix = getPrefix(css), cssAndUrls;
		cssAndUrls = modify.css(css, data.url, prefix, options);
		return inlineUrls(cssAndUrls, prefix, options, track).then(function (result) {
			var file = getFile(
				{
					url: data.url,
					hash: data.hash,
					blob: new Blob([result.text], {type: 'text/css'}),
					cache: data.cache
				}, options
			);
			file.blobs = file.blobs.concat(result.blobs);
			file.cache = file.cache.concat(result.cache);
			return file;
		});
	});
}

function getText (data, options) {
	return blobToText(data.blob).then(function (text) {
		var html, title, css;
		title = getTitleFromUrl(data.url);
		css = [
			'html {',
				'font: 16px sans-serif;',
				options.dark ? 'background: #333; color: #fff;' : '',
			'}',
			'pre {',
				'white-space: pre-wrap;',
			'}'
		].join('\n');
		html = [
			'<!DOCTYPE html>',
			'<html><head>',
			'<meta charset="utf-8">',
			'<title>' + title.replace(/</g, '&lt;') + '</title>',
			'<style>',
			css,
			'</style>',
			'</head><body>',
			'<pre>',
			text.replace(/</g, '&lt;'),
			'</pre>',
			'</body></html>'
		].join('\n');
		return getFile({
			url: data.url,
			hash: data.hash,
			blob: new Blob([html], {type: 'text/html'}),
			cache: data.cache
		}, options);
	});
}

function getError (data, options) {
	var file = getFile(data, options);
	file.title = 'Error';
	return file;
}

function getFile (data) {
	var blobUrl = URL.createObjectURL(data.blob);
	return {
		title: getTitleFromUrl(data.url),
		url: data.url,
		hash: data.hash,
		icon: getMainFavicon(data.url),
		searchEngines: [],
		content: blobUrl,
		blobs: [blobUrl],
		cache: [data.cache]
	};
}

function createErrorData (url, text) {
	return {
		url: url,
		hash: '',
		blob: new Blob([text], {type: 'text/plain'})
	};
}

function getDoc (url, options, track) {
	track = track || [];
	if (track.indexOf(url) > -1) {
		return Promise.resolve(getError(createErrorData(url, 'Recursive dependency on ' + url, options)));
	}
	track = [].slice.call(track);
	track.push(url);
	return getBlob(url, options).then(function (data) {
		switch (getType(data)) {
		case 'html':
			return getHTML(data, options, track);
		case 'css':
			return getCSS(data, options, track);
		case 'text':
			return getText(data, options);
		case 'error':
			return getError(data, options);
		default:
			return getFile(data, options);
		}
	});
}

function getDocOrError (url, options, track) {
	return getDoc(url, options, track).then(null,
		function (e) {
			//this should not happen, but - alas - sometimes it does
			return getError(createErrorData(url, String(e) + '\n\n' + String(e.stack)), options);
		}
	);
}

return getDocOrError;
})();