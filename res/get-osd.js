/*global getOSD: true*/
/*global getBlob, getFavicon*/
/*global Promise*/
getOSD =
(function () {
"use strict";

function isValidUrl (url) {
	return url.slice(0, 7) === 'http://' || url.slice(0, 8) === 'https://';
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

function prepareUrl (template, indexOffset, pageOffset) {
	var url = template;
	url = url.replace(/%s/g, '%25s');
	url = url.replace(/\{searchTerms\}/g, '%s');
	url = url.replace(/\{[^\}]*\?\}/g, ''); //remove optional parameters
	url = url.replace(/\{count\}/g, '20');
	url = url.replace(/\{startIndex\}/g, indexOffset);
	url = url.replace(/\{startPage\}/g, pageOffset);
	url = url.replace(/\{language\}/g, '*');
	url = url.replace(/\{inputEncoding\}/g, 'UTF-8');
	url = url.replace(/\{outputEncoding\}/g, 'UTF-8');
	if (/\{[^\}]*\}/.test(url)) { //unknown parameters
		return '';
	}
	if (!isValidUrl(url)) {
		return '';
	}
	return url;
}

function getUrl (osd) {
	var urls = [].map.call(osd.querySelectorAll('Url'), function (url) {
		var template = url.getAttribute('template') || '',
			rel = url.getAttribute('rel') || 'results',
			indexOffset = url.getAttribute('indexOffset') || '1',
			pageOffset = url.getAttribute('pageOffset') || '1';
		if (rel !== 'results') {
			return;
		}
		return prepareUrl(template, indexOffset, pageOffset);
	}).filter(function (url) {
		return url;
	});
	return urls[0];
}

function getName (osd) {
	var longName = osd.querySelector('LongName'),
		shortName = osd.querySelector('ShortName');
	longName = longName ? longName.textContent : '';
	shortName = shortName ? shortName.textContent : '';
	if (shortName && longName && shortName.length < longName.length && longName.length < 35) {
		return longName;
	}
	return shortName || longName;
}

function getIcon (osd) {
	var image = osd.querySelector('Image'), //TODO pick best icon
		url;
	if (!image) {
		return;
	}
	url = image.textContent;
	if (isValidUrl(url)) {
		return url;
	}
}

function getSearchEngineData (osd, useIcon) {
	var url = getUrl(osd), name = getName(osd);
	if (url && name) {
		return {
			url: url,
			title: name,
			icon: useIcon ? getIcon(osd) : ''
		};
	}
}

function getOSD (url, options) {
	return getBlob(url, options).then(function (data) {
		return blobToText(data.blob).then(function (xml) {
			var osd = (new DOMParser()).parseFromString(xml, 'application/xml'), data;
			data = getSearchEngineData(osd, options.useIcon);
			if (data.icon) {
				return getFavicon(data.icon, options).then(function (icon) {
					data.icon = icon;
					return data;
				});
			} else {
				return data;
			}
		});
	});
}

return getOSD;
})();