/*global LRU: true*/
LRU =
(function () {
"use strict";

function LRU (max) {
	this.max = max;
	this.keys = [];
	this.values = [];
}

LRU.prototype.trim = function () {
	while (this.keys.length > this.max) {
		this.keys.shift();
		this.values.shift();
	}
};

LRU.prototype.getRemove = function (key) {
	var i = this.keys.indexOf(key);
	if (i === -1) {
		return;
	}
	this.keys.splice(i, 1);
	return this.values.splice(i, 1)[0];
};

LRU.prototype.get = function (key) {
	var value = this.getRemove(key);
	if (value) {
		this.keys.push(key);
		this.values.push(value);
	}
	return value;
};

LRU.prototype.set = function (key, value) {
	this.getRemove(key);
	this.keys.push(key);
	this.values.push(value);
	this.trim();
};

return LRU;
})();