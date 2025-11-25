/*global Cache: true*/
/*global Database*/
/*global Promise*/
Cache =
(function () {
"use strict";

function Cache (key) {
	this.key = key;
	this.data = {};
	this.init = this.runInit();
	this.blobs = {};
}

function getDur (d) {
	d /= (1000 * 60 * 60);
	if (d < 1) {
		return 'less than an hour';
	}
	if (d < 1.5) {
		return '1 hour';
	}
	if (d < 18) {
		return Math.round(d) + ' hours';
	}
	d /= 24;
	if (d < 1.5) {
		return '1 day';
	}
	if (d < 20) {
		return Math.round(d) + ' days';
	}
	d /= (365.25 / 12);
	if (d < 1.5) {
		return '1 month';
	}
	if (d < 11.5) {
		return Math.round(d) + ' months';
	}
	d /= 12;
	if (d < 1.5) {
		return '1 year';
	}
	return Math.round(d) + ' years';
}

Cache.getInfo = function (data) {
	var urls = Object.keys(data), live = 0, i, cached,
		mainCached, hasCached = false, hasUncached = false,
		minD = 1 / 0, maxD = -1, now, dates, buttons;
	for (i = 0; i < urls.length; i++) {
		cached = data[urls[i]].d > -1;
		if (i === 0) {
			mainCached = cached;
		}
		if (cached) {
			hasCached = true;
			minD = Math.min(minD, data[urls[i]].d);
			maxD = Math.max(maxD, data[urls[i]].d);
		} else if (i > 0) {
			hasUncached = true;
		}
		live = Math.max(live, data[urls[i]].live || 0);
	}
	if (!hasCached) {
		buttons = [];
		if (live === 4 || urls.length > 1) {
			buttons.push({
				text: 'Cache basic resources',
				action: ['add', 0]
			});
		}
		buttons.push({
			text: 'Cache page (text only)',
			action: ['add', 1]
		});
		if (live >= 2) {
			buttons.push({
				text: 'Cache page with images',
				action: ['add', 2]
			});
		}
		return {
			type: 0,
			text: 'The page is currently not cached.',
			buttons: buttons
		};
	}
	now = Date.now();
	minD = getDur(now - minD);
	maxD = getDur(now - maxD);
	if (minD === maxD) {
		dates = 'The cached resources are ' + minD + ' old.';
	} else {
		dates = 'The cached resources are between ' + maxD + ' and ' + minD + ' old.';
	}
	if (!mainCached) {
		buttons = [{
			text: 'Remove basic resources from cache',
			action: ['remove', 0]
		}, {
			text: 'Update basic resources',
			action: ['update', 0]
		}, {
			text: 'Cache page (text only)',
			action: ['add', 1]
		}];
		if (live >= 2) {
			buttons.push({
				text: 'Cache page with images',
				action: ['add', 2]
			});
		}
		if (hasUncached || live === 4) {
			return {
				type: 1,
				text: 'The page is not cached, but some resources are.',
				dates: dates,
				buttons: buttons
			};
		}
		return {
			type: 1,
			text: 'The page is not cached, but all basic resources are.',
			dates: dates,
			buttons: buttons
		};
	}
	if (live >= 2) {
		buttons = [{
			text: 'Remove page from cache',
			action: ['remove', 1]
		}, {
			text: 'Update page (text only)',
			action: ['update', 1]
		}, {
			text: 'Cache page with images',
			action: ['add', 2]
		}];
	} else {
		buttons = [{
			text: 'Remove page from cache',
			action: ['remove', 2]
		}, {
			text: 'Update page (text only)',
			action: ['update', 2]
		}];
	}
	if (hasUncached || live >= 3) {
		return {
			type: 1,
			text: 'The page is cached, but some resources are not.',
			dates: dates,
			buttons: buttons
		};
	}
	if (live === 2) {
		return {
			type: 1,
			text: 'The page and its resources are cached, but not the images.',
			dates: dates,
			buttons: buttons
		};
	}
	if (live === 1) {
		return {
			type: 2,
			text: 'The page and its resources are cached, but not the media.',
			dates: dates,
			buttons: [{
				text: 'Remove page from cache',
				action: ['remove', 2]
			}, {
				text: 'Update page',
				action: ['update', 2]
			}]
		};
	}
	return {
		type: 2,
		text: 'The page and all its resources are cached.',
		dates: dates,
		buttons: [{
			text: 'Remove page from cache',
			action: ['remove', 2]
		}, {
			text: 'Update page',
			action: ['update', 2]
		}]
	};
};

Cache.prototype.runInit = function () {
	if (!this.key) {
		return Promise.resolve();
	}
	this.db = new Database(this.key);
	return this.db.get('').then(function (data) {
		this.data = data || {};
	}.bind(this));
};

Cache.prototype.has = function (url) {
	return !!this.data[url];
};

Cache.prototype.getMeta = function (url) {
	return JSON.parse(JSON.stringify(this.data[url]));
};

Cache.prototype.setMeta = function (url, data) {
	if (data) {
		this.data[url] = data;
	} else {
		delete this.data[url];
	}
};

Cache.prototype.getBlob = function (url) {
	if (!this.key) {
		return Promise.resolve(this.blobs[url]);
	}
	return this.db.get(url);
};

Cache.prototype.setBlob = function (url, blob) {
	this.blobs[url] = blob || null;
};

Cache.prototype.commit = function () {
	if (!this.key) {
		Object.keys(this.blobs).forEach(function (url) {
			if (!this.blobs[url]) {
				delete this.blobs[url];
			}
		}.bind(this));
		return Promise.resolve();
	}
	this.blobs[''] = this.data;
	return this.db.update(this.blobs).then(function () {
		this.blobs = {};
	}.bind(this), function (e) {
		this.blobs = {};
		//restore old data
		return this.db.get('').then(function (data) {
			this.data = data || {};
		}.bind(this)).then(function () {
			return Promise.reject(e);
		});
	}.bind(this));
};

Cache.prototype.getLists = function () {
	var list0 = [], list1 = [];
	Object.keys(this.data).forEach(function (url) {
		var data = this.data[url];
		if (data.sup.indexOf('') > -1) {
			list0.push([url, data.d]);
		} else {
			list1.push([url, data.d]);
		}
	}.bind(this));
	return [list0, list1];
};

Cache.prototype.test = function () {
	var urls0, urls1;
	if (this.key) {
		throw new Error('Cache.prototype.test called outside tests');
	}
	urls0 = Object.keys(this.data).sort();
	urls1 = Object.keys(this.blobs).sort();
	if (urls0.join('\n') !== urls1.join('\n')) {
		throw new Error('Cache in inconsistent state');
	}
	return urls0;
};

Cache.prototype.internalAdd = function (url, data, sup, update) {
	var meta, i;
	if (this.has(url)) {
		meta = this.getMeta(url);
		if (meta.sup.indexOf(sup) === -1) {
			meta.sup.push(sup);
		}
		if (data[url].embed) {
			for (i = 0; i < data[url].embed.length; i++) {
				if (meta.sub.indexOf(data[url].embed[i]) === -1) {
					meta.sub.push(data[url].embed[i]);
				}
			}
		}
		this.setMeta(url, meta);
	} else {
		meta = {
			d: Date.now(),
			sup: [sup],
			sub: data[url].embed || []
		};
		this.setMeta(url, meta);
		this.setBlob(url, data[url].blob);
	}
	for (i = 0; i < meta.sub.length; i++) {
		if (update) {
			this.internalUpdate(meta.sub[i], data, url);
		} else {
			this.internalAdd(meta.sub[i], data, url);
		}
	}
};

Cache.prototype.internalUpdate = function (url, data, sup) {
	var meta, i, old;
	if (!this.has(url)) {
		this.internalAdd(url, data, sup, true);
		return;
	}
	meta = this.getMeta(url);
	meta.d = Date.now();
	old = meta.sub;
	meta.sub = data[url].embed || [];
	this.setMeta(url, meta);
	this.setBlob(url, data[url].blob);
	for (i = 0; i < meta.sub.length; i++) {
		this.internalUpdate(meta.sub[i], data, url);
	}
	for (i = 0; i < old.length; i++) {
		if (meta.sub.indexOf(old[i]) === -1) {
			this.internalRemove(old[i], url);
		}
	}
};

Cache.prototype.internalRemove = function (url, sup) {
	var meta, i;
	if (!this.has(url)) {
		return;
	}
	meta = this.getMeta(url);
	i = meta.sup.indexOf(sup);
	if (i > -1) {
		meta.sup.splice(i, 1);
	} else if (sup === '') {
		meta.sup = [];
	} else {
		return;
	}
	if (meta.sup.length > 0) {
		this.setMeta(url, meta);
		return;
	}
	this.setMeta(url);
	this.setBlob(url);
	for (i = 0; i < meta.sub.length; i++) {
		this.internalRemove(meta.sub[i], url);
	}
};

Cache.prototype.add = function (url, data) {
	var i;
	if (Array.isArray(url)) {
		for (i = 0; i < url.length; i++) {
			this.internalAdd(url[i], data, '');
		}
	} else {
		this.internalAdd(url, data, '');
	}
	return this.commit();
};

Cache.prototype.update = function (url, data) {
	var i;
	if (Array.isArray(url)) {
		for (i = 0; i < url.length; i++) {
			this.internalUpdate(url[i], data, '');
		}
	} else {
		this.internalUpdate(url, data, '');
	}
	return this.commit();
};

Cache.prototype.remove = function (url) {
	var i;
	if (Array.isArray(url)) {
		for (i = 0; i < url.length; i++) {
			this.internalRemove(url[i], '');
		}
	} else {
		this.internalRemove(url, '');
	}
	return this.commit();
};

return Cache;
})();