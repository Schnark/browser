/*global Browser: true*/
(function () {
"use strict";

var browser = new Browser(document.body), prefs;

prefs = browser.getPrefs();
if ((prefs.welcome || 0) < 1) {
	prefs.welcome = 1;
	browser.setPrefs(prefs);
	browser.navigate('about:help');
} else {
	browser.showBookmarks();
}

if (navigator.mozSetMessageHandler) {
	navigator.mozSetMessageHandler('activity', function (request) {
		browser.settings.hide();
		browser.navigate(request.source.data.url, '_blank');
	});
}

})();