/*global Storage: true*/
Storage =
(function () {
"use strict";

function Storage (prefix) {
	this.prefix = prefix;
}

Storage.prototype.load = function (key, defaults) {
	try {
		return JSON.parse(localStorage.getItem(this.prefix + key) || 'x');
	} catch (e) {
		return defaults;
	}
};

Storage.prototype.save = function (key, data) {
	try {
		localStorage.setItem(this.prefix + key, JSON.stringify(data));
	} catch (e) {
	}
};

return Storage;
})();