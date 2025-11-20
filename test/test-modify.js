/*global QUnit, modify*/
//jscs:disable maximumLineLength
(function () {
"use strict";

var debugCache = {
	has: function (/*url*/) {
		return false;
	}
};

function cssSimple () {
	return [
		'* {',
		'\tmargin: 0;',
		'}'
	].join('\n');
}

function cssImport (url) {
	return '@import ' + url;
}

function cssBGImg (prop) {
	return [
		'#foo {',
		'\tbackground-image: ' + prop + ';',
		'}'
	].join('\n');
}

function cssNamespace () {
	return '@namespace m url("http://www.w3.org/1998/Math/MathML");';
}

function cssMedia (media, css) {
	return '@media ' + media + ' {\n\t' + css.split('\n').join('\t\n') + '\n}';
}

function cssFontFace (prop) {
	return [
		'@font-face {',
		'\tfont-family: FontName;',
		'\tsrc: ' + prop + ';',
		'}'
	].join('\n');
}

function htmlSimple (body, head) {
	return [
		'<!DOCTYPE html>',
		'<html><head>',
		'<title>Title</title>',
		'<meta charset="utf-8">',
		head || '',
		'</head><body>',
		body,
		'</body></html>'
	].join('\n');
}

function runCSSTests (tests, assert) {
	assert.expect(tests.length);
	tests.forEach(function (test) {
		var options = test.options || {};
		options.cache = debugCache;
		assert.deepEqual(
			modify.css(test.css, 'https://example.com/test.css', 'debug:', options).text,
			test.result,
			test.name
		);
	});
}

function docFromString (html) {
	return (new DOMParser()).parseFromString(html, 'text/html');
}

function stringFromDoc (doc) {
	return (new XMLSerializer()).serializeToString(doc);
}

function runHTMLTests (tests, assert) {
	assert.expect(tests.length);
	tests.forEach(function (test) {
		var doc = docFromString(test.html),
			options = test.options || {};
		options.cache = debugCache;
		modify.html(doc, 'https://example.com/test.html', 'debug:', options);
		assert.deepEqual(
			stringFromDoc(doc),
			stringFromDoc(docFromString(test.result)), //normalize
			test.name
		);
	});
}

QUnit.module('modify.css');
QUnit.test('Basic replacements', function (assert) {
	runCSSTests([
		{
			name: 'Simple CSS',
			css: cssSimple(),
			result: cssSimple()
		},
		{
			name: 'Adapt URL',
			css: cssBGImg('url("img.png")'),
			result: cssBGImg('url("debug:0")')
		},
		{
			name: 'Adapt URL with anchor',
			css: cssBGImg('url(img.svg#bar)'),
			result: cssBGImg('url(debug:0#bar)')
		},
		{
			name: 'Namespace url left alone',
			css: cssNamespace() + '\n\n' + cssSimple(),
			result: cssNamespace() + '\n\n' + cssSimple()
		}
	], assert);
});
QUnit.test('@import', function (assert) {
	runCSSTests([
		{
			name: 'Simple import',
			css: cssImport('"other.css"'),
			result: cssImport('"debug:0"')
		},
		{
			name: 'Url import',
			css: cssImport('url(other.css)'),
			result: cssImport('url(debug:0)')
		}
	], assert);
});
QUnit.test('Fonts', function (assert) {
	runCSSTests([
		{
			name: 'Simple font',
			css: cssFontFace('local("Font Name"), url("fonts/FontName-Regular.woff")'),
			result: cssFontFace('local("Font Name"), url("debug:0")')
		},
		{
			name: 'Multiple fonts',
			css: cssFontFace('local("Font Name"), url("fonts/FontName-Regular.woff") format("woff"), url("fonts/FN-R.woff2") format(woff2)'),
			result: cssFontFace('local("Font Name"), url("debug:0") format("woff"), url("debug:1") format(woff2)')
		},
		{
			name: 'Excluded font',
			options: {font: 'none'},
			css: cssFontFace('local("Font Name"), url("fonts/FontName-Regular.woff")'),
			result: cssFontFace('local("Font Name"), url("about:invalid")')
		},
		{
			name: 'Broken fonts (occurring in real stylesheets)',
			css: cssFontFace('url() format("eot"), url(#foo) format("svg")'),
			result: cssFontFace('url() format("eot"), url(#foo) format("svg")')
		}
	], assert);
});
QUnit.test('Different replacement options', function (assert) {
	runCSSTests([
		{
			name: 'none',
			options: {img: 'none'},
			css: cssBGImg('url(img.png)'),
			result: cssBGImg('url(about:invalid)')
		},
		{
			name: 'orig',
			options: {img: 'orig'},
			css: cssBGImg('url(img.png)'),
			result: cssBGImg('url(https://example.com/img.png)')
		},
		{
			name: 'proxy',
			options: {img: 'proxy', proxy: 'https://proxy.example/?url='},
			css: cssBGImg('url(img.png)'),
			result: cssBGImg('url(https://proxy.example/?url=https://example.com/img.png)')
		}
	], assert);
});
QUnit.test('Different types', function (assert) {
	runCSSTests([
		{
			name: 'Embed all',
			css: cssImport('"other.css"') + '\n' + cssFontFace('url("font.ttf")') + '\n' + cssBGImg('url(img.png)'),
			result: cssImport('"debug:0"') + '\n' + cssFontFace('url("debug:2")') + '\n' + cssBGImg('url(debug:1)')
		},
		{
			name: 'Drop CSS',
			options: {css: 'none'},
			css: cssImport('"other.css"') + '\n' + cssFontFace('url("font.ttf")') + '\n' + cssBGImg('url(img.png)'),
			result: cssImport('"about:invalid"') + '\n' + cssFontFace('url("debug:1")') + '\n' + cssBGImg('url(debug:0)')
		},
		{
			name: 'Drop Font',
			options: {font: 'none'},
			css: cssImport('"other.css"') + '\n' + cssFontFace('url("font.ttf")') + '\n' + cssBGImg('url(img.png)'),
			result: cssImport('"debug:0"') + '\n' + cssFontFace('url("about:invalid")') + '\n' + cssBGImg('url(debug:1)')
		},
		{
			name: 'Drop Image',
			options: {img: 'none'},
			css: cssImport('"other.css"') + '\n' + cssFontFace('url("font.ttf")') + '\n' + cssBGImg('url(img.png)'),
			result: cssImport('"debug:0"') + '\n' + cssFontFace('url("debug:1")') + '\n' + cssBGImg('url(about:invalid)')
		}
	], assert);
});
QUnit.test('Dark scheme', function (assert) {
	runCSSTests([
		{
			name: 'Simple dark scheme',
			css: cssMedia('(prefers-color-scheme: dark)', cssSimple()),
			result: cssMedia('(prefers-color-scheme: dark)', cssSimple())
		},
		{
			name: 'Replaced dark scheme',
			options: {dark: true},
			css: cssMedia('(prefers-color-scheme: dark)', cssSimple()),
			result: cssMedia('screen', cssSimple())
		}
	], assert);
});

QUnit.module('modify.html');
QUnit.test('Basic replacements', function (assert) {
	runHTMLTests([
		{
			name: 'Simple document',
			html: htmlSimple('<p>Test</p>'),
			result: htmlSimple('<p>Test</p>')
		},
		{
			name: 'Links',
			html: htmlSimple('<p><a href="link.html">Link</a>, <a href="http://example.org/foo">Link</a></p>'),
			result: htmlSimple('<p><a href="https://example.com/link.html">Link</a>, <a href="http://example.org/foo">Link</a></p>')
		},
		{
			name: 'Images',
			options: {img: 'orig'},
			html: htmlSimple('<p><img src="image.jpg" />, <img src="http://example.org/foo.png" /></p>'),
			result: htmlSimple('<p><img src="https://example.com/image.jpg">, <img src="http://example.org/foo.png"></p>')
		},
		{
			name: 'Unknown elements',
			html: htmlSimple('<future-element href="image.jpg">Your browser does not support &lt;future-element&gt;</future-element>'),
			result: htmlSimple('<future-element href="image.jpg">Your browser does not support &lt;future-element&gt;</future-element>')
		}
	], assert);
});
QUnit.test('<base> tag', function (assert) {
	runHTMLTests([
		{
			name: 'href and target',
			html: htmlSimple('<p><a href="link.html">Link</a>, <a href="http://example.org/foo">Link</a></p>', '<base href="https://base.example/index.html" target="_blank">'),
			result: htmlSimple('<p><a href="https://base.example/link.html">Link</a>, <a href="http://example.org/foo">Link</a></p>', '<base href="" target="_blank">')
		},
		{
			name: 'href and no target',
			html: htmlSimple('<p><a href="link.html">Link</a>, <a href="http://example.org/foo">Link</a></p>', '<base href="https://base.example/index.html">'),
			result: htmlSimple('<p><a href="https://base.example/link.html">Link</a>, <a href="http://example.org/foo">Link</a></p>')
		},
		{
			name: 'no href but target',
			html: htmlSimple('<p><a href="link.html">Link</a>, <a href="http://example.org/foo">Link</a></p>', '<base target="_blank">'),
			result: htmlSimple('<p><a href="https://example.com/link.html">Link</a>, <a href="http://example.org/foo">Link</a></p>', '<base target="_blank">')
		},
		{
			name: 'two tags, first href, then target',
			html: htmlSimple('<p><a href="link.html">Link</a>, <a href="http://example.org/foo">Link</a></p>', '<base href="https://base.example/index.html"><base target="_blank">'),
			result: htmlSimple('<p><a href="https://base.example/link.html">Link</a>, <a href="http://example.org/foo">Link</a></p>', '<base target="_blank">')
		},
		{
			name: 'two tags, first target, then href',
			html: htmlSimple('<p><a href="link.html">Link</a>, <a href="http://example.org/foo">Link</a></p>', '<base target="_blank"><base href="https://base.example/index.html">'),
			result: htmlSimple('<p><a href="https://base.example/link.html">Link</a>, <a href="http://example.org/foo">Link</a></p>', '<base target="_blank">')
		}
	], assert);
});
QUnit.test('CSS', function (assert) {
	runHTMLTests([
		{
			name: 'none',
			options: {css: 'none'},
			html: htmlSimple('<p style="background-image: url(img.png);"></p>', '<link rel="stylesheet" href="style.css"><style>' + cssBGImg('url("img.png")') + '</style>'),
			result: htmlSimple('<p></p>')
		},
		{
			name: 'inline',
			options: {css: 'inline'},
			html: htmlSimple('<p style="background-image: url(img.png);"></p>', '<link rel="stylesheet" href="style.css"><style>' + cssBGImg('url("img.png")') + '</style>'),
			result: htmlSimple('<p style="background-image: url(debug:0);"></p>')
		},
		{
			name: 'orig',
			options: {css: 'orig'},
			html: htmlSimple('<p style="background-image: url(img.png);"></p>', '<link rel="stylesheet" href="style.css"><style>' + cssBGImg('url("img.png")') + '</style>'),
			result: htmlSimple('<p style="background-image: url(debug:0);"></p>', '<link rel="stylesheet" href="https://example.com/style.css"><style>' + cssBGImg('url("debug:0")') + '</style>')
		},
		{
			name: 'proxy',
			options: {css: 'proxy', proxy: 'https://proxy.example/'},
			html: htmlSimple('<p style="background-image: url(img.png);"></p>', '<link rel="stylesheet" href="style.css"><style>' + cssBGImg('url("img.png")') + '</style>'),
			result: htmlSimple('<p style="background-image: url(debug:0);"></p>', '<link rel="stylesheet" href="https://proxy.example/https://example.com/style.css"><style>' + cssBGImg('url("debug:0")') + '</style>')
		},
		{
			name: 'embed',
			html: htmlSimple('<p style="background-image: url(img.png);"></p>', '<link rel="stylesheet" href="style.css"><style>' + cssBGImg('url("img.png")') + '</style>'),
			result: htmlSimple('<p style="background-image: url(debug:0);"></p>', '<link rel="stylesheet" href="debug:1"><style>' + cssBGImg('url("debug:0")') + '</style>')
		}
	], assert);
});
QUnit.test('Responsive viewport', function (assert) {
	runHTMLTests([
		{
			name: 'Add viewport tag',
			options: {responsive: true},
			html: htmlSimple(''),
			result: htmlSimple('', '\n<meta name="viewport" content="width=device-width">').replace('\n</head>', '</head>')
		},
		{
			name: 'Change viewport tag',
			options: {responsive: true},
			html: htmlSimple('', '<meta name="viewport" content="width=300px">'),
			result: htmlSimple('', '<meta name="viewport" content="width=device-width">')
		},
		{
			name: 'Keep viewport tag',
			options: {responsive: true},
			html: htmlSimple('', '<meta name="viewport" content="width=device-width">'),
			result: htmlSimple('', '<meta name="viewport" content="width=device-width">')
		}
	], assert);
});
QUnit.test('JS', function (assert) {
	runHTMLTests([
		{
			name: 'Drop scripts',
			options: {js: 'none'},
			html: htmlSimple('', '<script src="script.js"></script><script>var global;</script>'),
			result: htmlSimple('')
		},
		{
			name: '<noscript>',
			options: {js: 'none'},
			html: htmlSimple('before <noscript><span>no</span>script</noscript> after'),
			result: htmlSimple('before <span>no</span>script after')
		},
		{
			name: 'onclick',
			options: {js: 'none'},
			html: htmlSimple('<span onclick="javascript:alert(1);">Alert</span>'),
			result: htmlSimple('<span>Alert</span>')
		},
		{
			name: 'javascript-URLs',
			options: {js: 'none'},
			html: htmlSimple('<a href="javascript:alert(1);">Alert</a>'),
			result: htmlSimple('<a href="#">Alert</a>')
		}
	], assert);
});
QUnit.test('Links', function (assert) {
	runHTMLTests([
		{
			name: 'Simple',
			html: htmlSimple('<a href="link.html">Link</a>, <a href="http://example.org/link.html">External</a>'),
			result: htmlSimple('<a href="https://example.com/link.html">Link</a>, <a href="http://example.org/link.html">External</a>')
		},
		{
			name: 'With hash',
			html: htmlSimple('<a href="link.html#foo">Link</a>, <a href="http://example.org/link.html#foo">External</a>'),
			result: htmlSimple('<a href="https://example.com/link.html#foo">Link</a>, <a href="http://example.org/link.html#foo">External</a>')
		},
		{
			name: 'Only hash',
			html: htmlSimple('<a href="#foo">Link</a>, <a href="https://example.com/test.html#foo">Link</a>'),
			result: htmlSimple('<a href="#foo">Link</a>, <a href="#foo">Link</a>')
		}
	], assert);
});
QUnit.test('Embedded SVG', function (assert) {
	runHTMLTests([
		{
			name: 'SVG',
			options: {img: 'orig'},
			html: htmlSimple('<svg><use xlink:href="icon.svg#icon" href="icon.svg#icon" /></svg>'),
			result: htmlSimple('<svg><use xlink:href="https://example.com/icon.svg#icon" href="https://example.com/icon.svg#icon" /></svg>')
		}
	], assert);
});
QUnit.test('Audio, Video', function (assert) {
	runHTMLTests([
		{
			name: 'Audio',
			options: {media: 'orig'},
			html: htmlSimple('<audio src="music.mp3" controls>'),
			result: htmlSimple('<audio src="https://example.com/music.mp3" controls>')
		},
		{
			name: 'Video',
			options: {media: 'none', img: 'orig'},
			html: htmlSimple('<video poster="poster.jpg" controls><source src="video.mp4" type="video/mp4"></video>'),
			result: htmlSimple('<video poster="https://example.com/poster.jpg" controls><source src="about:invalid" type="video/mp4"></video>')
		},
		{
			name: 'Manual control',
			options: {media: 'orig', manualMedia: true},
			html: htmlSimple('<audio autoplay loop src="music.mp3">'),
			result: htmlSimple('<audio controls preload="none" src="https://example.com/music.mp3">')
		}
	], assert);
});
QUnit.test('Special hrefs', function (assert) {
	runHTMLTests([
		{
			name: 'manifest',
			html: htmlSimple('').replace('<html>', '<html manifest="cache.manifest">'),
			result: htmlSimple('')
		},
		{
			name: 'ping',
			html: htmlSimple('<a href="link.html" ping="ping.html">Link</a>'),
			result: htmlSimple('<a href="https://example.com/link.html">Link</a>')
		},
		{
			name: 'refresh',
			html: htmlSimple('', '<meta http-equiv="refresh" content="5;html/index.html">'),
			result: htmlSimple('')
		},
		{
			name: 'icon',
			html: htmlSimple('', '<link rel="icon" href="favicon.png">'),
			result: htmlSimple('', '<link rel="icon" href="https://example.com/favicon.png">')
		}
	], assert);
});
QUnit.test('Forms', function (assert) {
	runHTMLTests([
		{
			name: 'Default form',
			html: htmlSimple('<form action=""><button>Submit</button><input type="submit"></form>'),
			result: htmlSimple('<form action="https://example.com/test.html"><button>Submit</button><input type="submit"></form>')
		},
		{
			name: 'Form with GET',
			html: htmlSimple('<form action="/form.php" method="GET"><button>Submit</button><input type="submit"></form>'),
			result: htmlSimple('<form action="https://example.com/form.php" method="GET"><button>Submit</button><input type="submit"></form>')
		},
		{
			name: 'Form with POST',
			html: htmlSimple('<form action="" method="POST"><button>Submit</button><input type="SUBMIT"></form>'),
			result: htmlSimple('<form action="https://example.com/test.html" method="POST"><button disabled>Submit</button><input type="SUBMIT" disabled></form>')
		},
		{
			name: 'Form with POST changed to GET',
			options: {postget: true},
			html: htmlSimple('<form action="" method="POST"><button>Submit</button><input type="SUBMIT"></form>'),
			result: htmlSimple('<form action="https://example.com/test.html" method="get"><button>Submit</button><input type="SUBMIT"></form>')
		}
	], assert);
});
QUnit.test('Frames', function (assert) {
	runHTMLTests([
		{
			name: 'Embedded iframe',
			html: htmlSimple('<iframe src="frame.html"></iframe>'),
			result: htmlSimple('<iframe src="debug:0"></iframe>')
		},
		{
			name: 'Linked iframe',
			options: {html: 'orig'},
			html: htmlSimple('<iframe src="frame.html"></iframe>'),
			result: htmlSimple('<iframe src="https://example.com/frame.html"></iframe>')
		},
		{
			name: 'Embedded frameset',
			html: '<html><frameset cols="50%,50%"><frame src="left.html"><frame src="right.html"></frameset></html>',
			result: '<html><frameset cols="50%,50%"><frame src="debug:0"><frame src="debug:1"></frameset></html>'
		},
		{
			name: 'Linked frameset',
			options: {html: 'orig'},
			html: '<html><frameset cols="50%,50%"><frame src="left.html"><frame src="right.html"></frameset></html>',
			result: '<html><frameset cols="50%,50%"><frame src="https://example.com/left.html"><frame src="https://example.com/right.html"></frameset></html>'
		}
	], assert);
});
QUnit.test('Additional CSS/JS', function (assert) {
	runHTMLTests([
		{
			name: 'Add one CSS file',
			options: {addCSS: ['add.css']},
			html: htmlSimple(''),
			result: htmlSimple('', '\n<link rel="stylesheet" href="add.css">').replace('\n</head>', '</head>')
		},
		{
			name: 'Add two CSS files',
			options: {addCSS: ['one.css', 'two.css']},
			html: htmlSimple(''),
			result: htmlSimple('', '\n<link rel="stylesheet" href="one.css"><link rel="stylesheet" href="two.css">').replace('\n</head>', '</head>')
		},
		{
			name: 'Add to existing CSS file',
			options: {css: 'orig', addCSS: ['add.css']},
			html: htmlSimple('', '<link rel="stylesheet" href="css.css">'),
			result: htmlSimple('', '<link rel="stylesheet" href="https://example.com/css.css">\n<link rel="stylesheet" href="add.css">').replace('\n</head>', '</head>')
		},
		{
			name: 'Replace existing CSS file',
			options: {css: 'none', addCSS: ['add.css']},
			html: htmlSimple('', '<link rel="stylesheet" href="css.css">'),
			result: htmlSimple('', '\n<link rel="stylesheet" href="add.css">').replace('\n</head>', '</head>')
		},
		{
			name: 'Add one JS file',
			options: {addJS: ['add.js']},
			html: htmlSimple(''),
			result: htmlSimple('', '\n<script src="add.js"></script>').replace('\n</head>', '</head>')
		},
		{
			name: 'Add to existing JS file',
			options: {js: 'orig', addJS: ['add.js']},
			html: htmlSimple('', '<script src="js.js"></script>'),
			result: htmlSimple('', '<script src="add.js"></script><script src="https://example.com/js.js"></script>')
		},
		{
			name: 'Replace existing JS file',
			options: {js: 'none', addJS: ['add.js']},
			html: htmlSimple('', '<script src="js.js"></script>'),
			result: htmlSimple('', '\n<script src="add.js"></script>').replace('\n</head>', '</head>')
		}
	], assert);
});

})();