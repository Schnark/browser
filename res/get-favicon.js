/*global getFavicon: true*/
/*global logger, getBlob, LRU*/
/*global URL, Promise*/
getFavicon =
(function () {
"use strict";

var lru = new LRU(20);

function drawFavicon (blob) {
	return new Promise(function (resolve) {
		var url = URL.createObjectURL(blob),
			img = document.createElement('img'),
			canvas = document.createElement('canvas'),
			ctx = canvas.getContext('2d');
		canvas.width = 20;
		canvas.height = 20;
		img.onload = function () {
			var dataUrl;
			try {
				URL.revokeObjectURL(url);
				ctx.fillStyle = '#eee';
				ctx.fillRect(0, 0, 20, 20);
				ctx.drawImage(img, 2, 2, 16, 16);
				dataUrl = canvas.toDataURL('image/png');
				logger.log('FAVICON-SUCCESS', '');
			} catch (e) {
				logger.log('FAVICON-ERROR', String(e));
			}
			resolve(dataUrl);
		};
		img.onerror = function () {
			logger.log('FAVICON-ERROR', '');
			URL.revokeObjectURL(url);
			resolve();
		};
		img.src = url;
	});
}

function createFavicon (url, options) {
	return getBlob(url, options).then(function (result) {
		if (result.error) {
			return;
		}
		return drawFavicon(result.blob);
	});
}

function getFavicon (url, options) {
	var result;
	logger.log('FAVICON', url);
	options.timeout = 2000;
	if (!options.noCache) {
		result = lru.get(url);
		if (result) {
			logger.log('FAVICON-LRU', url);
			return result;
		}
	}
	result = createFavicon(url, options);
	lru.set(url, result);
	return result;
}

return getFavicon;
})();