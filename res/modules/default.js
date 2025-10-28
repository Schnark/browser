(function () {
"use strict";

function navigate (url, target) {
	window.top.postMessage({type: 'navigate', url: url, target: target}, '*');
}

function contextmenu (context) {
	window.top.postMessage({type: 'context-menu', context: context}, '*');
}

function isValidLink (url) {
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

function formToQuery (form) {
	//TODO follow spec more closely
	return [].map.call(form.querySelectorAll('input, select, textarea'), function (input) {
		var bool = input.type === 'checkbox' || input.type === 'radio';
		if (
			input.name &&
			!input.disabled &&
			(!bool || input.checked)
		) {
			return input.name + '=' + encodeURIComponent(bool ? input.value || 'on' : input.value);
		}
	}).filter(function (q) {
		return q;
	}).join('&');
}

function getLink (el) {
	while (el && (el.tagName !== 'A' && el.tagName !== 'AREA')) {
		el = el.parentElement;
	}
	return el;
}

function getTarget (el) {
	var base;
	if (el.target) {
		return el.target;
	}
	base = document.querySelector('base[target]');
	if (base) {
		return base.target;
	}
}

document.addEventListener('click', function (e) {
	var link, href, el;
	if (!e.defaultPrevented && e.button === 0) {
		link = getLink(e.target);
		if (link) {
			href = link.getAttribute('href');
		}
		if (!href) {
			return;
		}
		if (href.charAt(0) === '#') {
			//native link will not work in old versions
			el = document.getElementById(href.slice(1));
			if (el) {
				el.scrollIntoView();
			} else if (href === '#top') {
				document.documentElement.scrollTop = 0;
				document.body.scrollTop = 0; //quirks mode
			}
		} else if (isValidLink(href)) {
			//TODO handle ismap
			//TODO handle download
			e.preventDefault();
			navigate(href, getTarget(link));
		}
	}
}, true);

document.addEventListener('contextmenu', function (e) {
	var context = [], link, url;
	if (!e.defaultPrevented) {
		e.preventDefault();
		if (e.target.tagName === 'IMG') {
			url = e.target.getAttribute('src');
			if (url && url !== 'about:invalid') {
				context.push({
					type: 'img',
					url: url
				});
			}
		}
		url = '';
		link = getLink(e.target);
		if (link) {
			url = link.getAttribute('href');
		}
		if (url && url.charAt(0) !== '#') {
			context.push({
				type: 'a',
				url: url
			});
		}
		contextmenu(context);
	}
}, true);

document.addEventListener('submit', function (e) {
	if (!e.defaultPrevented && isValidLink(e.target.action)) {
		e.preventDefault();
		navigate(e.target.action + '?' + formToQuery(e.target), getTarget(e.target));
	}
}, true);
})();