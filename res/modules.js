/*global Modules: true*/
Modules =
(function () {
"use strict";

function Modules (defs) {
	this.defs = defs;
	this.init();
}

function escapeRE (str) {
	return str.replace(/([\\{}()|.?*+\-\^$\[\]])/g, '\\$1');
}

Modules.prototype.init = function () {
	var regExps = [];

	function add (entry, index) {
		var re;
		re = escapeRE(entry).replace(/\\\*/g, '.*').replace(/\\\?/g, '.');
		if (re.indexOf('/') === -1) {
			re += '/';
		}
		if (re.slice(0, 7) !== 'file://' && re.slice(0, 7) !== 'http://' && re.slice(0, 8) !== 'https://') {
			re = 'https?://' + re;
		}
		re = '^' + re;
		regExps.push({i: index, l: entry.length, re: new RegExp(re, 'i')});
	}

	this.defs.forEach(function (def, i) {
		if (Array.isArray(def.apply)) {
			def.apply.forEach(function (entry) {
				add(entry, i);
			});
		} else {
			add(def.apply, i);
		}
	});

	regExps.sort(function (a, b) {
		return b.l - a.l;
	});
	this.regExps = regExps;
};

Modules.prototype.getDefaults = function (url) {
	var i;
	for (i = 0; i < this.regExps.length; i++) {
		if (this.regExps[i].re.test(url)) {
			return this.defs[this.regExps[i].i];
		}
	}
	return {};
};

return Modules;
})();