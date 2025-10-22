/*global logger: true*/
logger =
(function () {
"use strict";

var entries = [];

function getTimestamp () {
	var now = new Date();

	function pad (n) {
		return n < 10 ? '0' + String(n) : String(n);
	}

	return pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds()) +
		'.' + String(now.getMilliseconds() + 1000).slice(1);
}

function log (type, entry) {
	entries.unshift('[' + getTimestamp() + '] ' + type + ' ' + entry);
}

function getLog () {
	return entries.join('\n');
}

return {
	log: log,
	get: getLog
};
})();