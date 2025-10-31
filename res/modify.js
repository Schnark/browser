/*global modify: true*/
/*global URL*/
modify =
(function () {
"use strict";

function isSpecialUrl (url) {
	return [
		'http', 'https', 'file'
	].indexOf(url.split(':')[0].toLowerCase()) === -1;
}

function modifyCSS (css, baseUrl, prefix, options, urls) {
	urls = urls || [];

	function replaceUrl (url, type) {
		var hashIndex, hash = '', mode, i;
		if (!url || url.charAt(0) === '#') {
			return url;
		}
		url = String(new URL(url, baseUrl));
		if (isSpecialUrl(url)) {
			return url;
		}
		hashIndex = url.indexOf('#');
		if (hashIndex > -1) {
			hash = url.slice(hashIndex);
			url = url.slice(0, hashIndex);
		}
		if (!type) {
			//TODO recognize type from context
			if (/\.css($|\?)/.test(url)) {
				type = 'css';
			} else if (/\.(woff2?|eot|ttf)($|\?)/.test(url)) {
				type = 'font';
			} else {
				type = 'img';
			}
		}

		mode = options[type];
		switch (mode) {
		case 'none': case 'inline': return 'about:invalid';
		case 'orig': return url + hash;
		case 'proxy': return options.proxy + url + hash;
		}

		i = urls.indexOf(url);
		if (i > -1) {
			return prefix + i + hash;
		}
		urls.push(url);
		return prefix + (urls.length - 1) + hash;
	}

	css = css.replace(/(@namespace\s+(?:\S+\s+)?url)\(/ig, '$1['); //hide @namespace URLs
	css = css.replace(/(@import\s+")((?:[^"\\\n]|\\.)*)(")/ig, function (all, pre, url, post) {
		return pre + replaceUrl(url, 'css') + post;
	});
	css = css.replace(/(@import\s+')((?:[^'\\\n]|\\.)*)(')/ig, function (all, pre, url, post) {
		return pre + replaceUrl(url, 'css') + post;
	});
	css = css.replace(/(url\(\s*)((?:[^"'()\\ \n]|\\.)*)(\s*\))/ig, function (all, pre, url, post) {
		return pre + replaceUrl(url) + post;
	});
	css = css.replace(/(url\(\s*")((?:[^"\\\n]|\\.)*)("\s*\))/ig, function (all, pre, url, post) {
		return pre + replaceUrl(url) + post;
	});
	css = css.replace(/(url\(\s*')((?:[^'\\\n]|\\.)*)('\s*\))/ig, function (all, pre, url, post) {
		return pre + replaceUrl(url) + post;
	});
	css = css.replace(/(@namespace\s+(?:\S+\s+)?url)\[/ig, '$1(');
	if (options.dark) {
		css = css.replace(/@media\s*\(\s*prefers-color-scheme:\s*dark\s*\)/g, '@media screen');
	}
	return {
		text: css,
		urls: urls
	};
}

function modifyHTML (doc, baseUrl, prefix, options) {
	var urls = [],
		base,
		els;

	function appendHead (el, beforeJS) {
		var head, script;
		head = doc.getElementsByTagName('head')[0];
		if (beforeJS) {
			script = head.getElementsByTagName('script')[0];
			if (script) {
				head.insertBefore(el, script);
				return;
			}
		}
		head.appendChild(el);
	}

	function getNewUrl (url, type) {
		var mode, i;
		if (isSpecialUrl(url) || type === 'link') {
			return url;
		}

		mode = options[type];
		switch (mode) {
		case 'none': case 'inline': return 'about:invalid';
		case 'orig': return url;
		case 'proxy': return options.proxy + url;
		}

		i = urls.indexOf(url);
		if (i > -1) {
			return prefix + i;
		}
		urls.push(url);
		return prefix + (urls.length - 1);
	}

	//fix base URL
	base = doc.querySelector('base[href]');
	if (base) {
		base.href = String(new URL(base.getAttribute('href'), baseUrl));
	} else {
		base = doc.createElement('base');
		doc.querySelector('head').appendChild(base);
		base.href = baseUrl;
	}

	//no preload
	[].forEach.call(doc.querySelectorAll('link[rel="preload"]'), function (el) {
		el.parentElement.removeChild(el);
	});

	//drop scripts and styles according to options
	if (options.js === 'none' || options.js === 'inline') {
		[].forEach.call(doc.querySelectorAll('script'), function (el) {
			el.parentElement.removeChild(el);
		});
		if (options.js === 'none') {
			[].forEach.call(doc.querySelectorAll('noscript'), function (el) {
				while (el.firstChild) {
					el.parentElement.insertBefore(el.firstChild, el);
				}
				el.parentElement.removeChild(el);
			});
			//TODO do this for all on... attributes (but that would be slow or complicated,
			//and onclick is the only really relevant)
			[].forEach.call(doc.querySelectorAll('[onclick]'), function (el) {
				el.removeAttribute('onclick');
			});
			[].forEach.call(doc.querySelectorAll('[href^="javascript:"]'), function (el) {
				el.setAttribute('href', '#');
			});
		}
	}
	if (options.css === 'none' || options.css === 'inline') {
		[].forEach.call(doc.querySelectorAll('style, link[rel~="stylesheet"]'), function (el) {
			el.parentElement.removeChild(el);
		});
		if (options.css === 'none') {
			[].forEach.call(doc.querySelectorAll('[style]'), function (el) {
				el.removeAttribute('style');
			});
		}
	}

	//process embeded styles
	[].forEach.call(doc.querySelectorAll('style'), function (style) {
		var result = modifyCSS(style.textContent, baseUrl, prefix, options, urls);
		style.textContent = result.text;
	});
	[].forEach.call(doc.querySelectorAll('[style]'), function (el) {
		var result;
		result = modifyCSS(el.getAttribute('style'), baseUrl, prefix, options, urls);
		el.setAttribute('style', result.text);
	});

	//process links etc.
	[].forEach.call(doc.querySelectorAll('[href]:not(base), [src]'), function (el) {
		var url = el.href || el.src, type, hashIndex, hash = '';
		if (!url) {
			//happens for unknown elements
			return;
		}
		if (url.baseVal) {
			url = String(new URL(url.baseVal, baseUrl));
		}
		hashIndex = url.indexOf('#');
		if (hashIndex > -1) {
			hash = url.slice(hashIndex);
			url = url.slice(0, hashIndex);
		}
		if (el.tagName === 'LINK') {
			type = el.rel === 'stylesheet' ? 'css' : 'link';
		} else if (el.tagName === 'A' || el.tagName === 'AREA') {
			type = 'link';
		} else if (el.tagName === 'SCRIPT') {
			type = 'js';
		} else if (el.tagName === 'IMG' || el.tagName === 'image' || el.tagName === 'use') {
			type = 'img';
		} else if (el.tagName === 'IFRAME' || el.tagName === 'FRAME') {
			type = 'html';
		} else {
			type = 'media';
		}
		el.setAttribute(
			el.href ? 'href' : 'src',
			url === base.href ? hash : getNewUrl(url, type) + hash
		);
	});
	[].forEach.call(doc.querySelectorAll('[poster]'), function (el) {
		var url = el.poster, hashIndex, hash = '';
		if (!url) {
			return;
		}
		hashIndex = url.indexOf('#');
		if (hashIndex > -1) {
			hash = url.slice(hashIndex);
			url = url.slice(0, hashIndex);
		}
		el.setAttribute('poster', getNewUrl(url, 'img') + hash);
	});
	//TODO also formaction
	[].forEach.call(doc.querySelectorAll('[action]'), function (el) {
		var url = el.action || base.href,
			hashIndex = url.indexOf('#'), hash = '';
		if (hashIndex > -1) {
			hash = url.slice(hashIndex);
			url = url.slice(0, hashIndex);
		}
		el.setAttribute('action', getNewUrl(url, 'link') + hash);
	});
	[].forEach.call(doc.querySelectorAll('use, image'), function (el) {
		var url = el.getAttribute('xlink:href'), hashIndex, hash = '';
		if (!url) {
			return;
		}
		url = String(new URL(url, baseUrl));
		hashIndex = url.indexOf('#');
		if (hashIndex > -1) {
			hash = url.slice(hashIndex);
			url = url.slice(0, hashIndex);
		}
		el.setAttribute('xlink:href', url === base.href ? hash : getNewUrl(url, 'img') + hash);
	});

	//remove some hrefs
	[].forEach.call(doc.querySelectorAll('[ping]'), function (el) {
		el.removeAttribute('ping');
	});
	if (doc.getElementsByTagName('html')[0].hasAttribute('manifest')) {
		doc.getElementsByTagName('html')[0].removeAttribute('manifest');
	}
	[].forEach.call(doc.querySelectorAll('meta[http-equiv="refresh"]'), function (el) {
		el.parentElement.removeChild(el);
	});

	//TODO handle srcset properly
	[].forEach.call(doc.querySelectorAll('[srcset]'), function (el) {
		el.removeAttribute('srcset');
	});

	//optionally: for <audio> and <video>: add controls, drop autoplay and loop, set preload="none"
	if (options.manualMedia) {
		[].forEach.call(doc.querySelectorAll('audio, video'), function (el) {
			el.preload = 'none';
			el.controls = true;
			el.autoplay = false;
			el.loop = false;
		});
	}

	if (options.postget) {
		[].forEach.call(doc.querySelectorAll('form[method="post"]'), function (el) {
			el.method = 'get';
		});
	} else {
		//disable POSTed forms
		//TODO also for connected buttons outside the form etc.
		[].forEach.call(doc.querySelectorAll('form[method="post"]'), function (el) {
			[].forEach.call(el.querySelectorAll(
				'button:not([type]), button[type="submit"], input[type="submit"]'
			), function (el) {
				el.disabled = true;
			});
		});
	}

	//make page responsive
	if (options.responsive) {
		els = doc.querySelectorAll('meta[name="viewport"]');
		if (els.length) {
			[].forEach.call(els, function (el) {
				el.setAttribute('content', 'width=device-width');
			});
		} else {
			els = doc.createElement('meta');
			els.content = 'width=device-width';
			els.name = 'viewport';
			appendHead(els);
		}
	}

	//reset base tag
	if (base.target) {
		base.href = '';
	} else {
		doc.querySelector('head').removeChild(base);
	}

	//additional styles, scripts
	if (options.addCSS) {
		options.addCSS.forEach(function (css) {
			els = doc.createElement('link');
			els.href = css;
			els.rel = 'stylesheet';
			appendHead(els);
		});
	}
	if (options.addJS) {
		options.addJS.reverse().forEach(function (js) {
			els = doc.createElement('script');
			els.src = js;
			appendHead(els, true);
		});
	}

	return urls;
}

return {
	css: modifyCSS,
	html: modifyHTML
};
})();