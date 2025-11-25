/*global Database: true*/
/*global indexedDB, Promise*/
//loosely based on async_storage.js from Gaia utils
Database =
(function () {
"use strict";

function Database (key) {
	this.key = key;
	if (!window.indexedDB) {
		this.db = null;
	}
}

Database.prototype.withDB = function (callback) {
	var request;
	if (this.db !== undefined) {
		callback(this.db);
	} else {
		request = indexedDB.open(this.key, 1);
		request.onerror = function () {
			this.db = null;
			callback(this.db);
		}.bind(this);
		request.onupgradeneeded = function () {
			request.result.createObjectStore('store');
		};
		request.onsuccess = function () {
			this.db = request.result;
			callback(this.db);
		}.bind(this);
	}
};

Database.prototype.withStore = function (type, callback, onsuccess, onerror) {
	this.withDB(function (db) {
		var transaction;
		if (!db) {
			onerror();
			return;
		}
		transaction = db.transaction('store', type);
		transaction.oncomplete = onsuccess;
		transaction.onerror = onerror;
		callback(transaction.objectStore('store'));
	});
};

Database.prototype.getItem = function (key, callback) {
	var request;
	this.withStore('readonly', function (store) {
		request = store.get(key);
	}, function () {
		callback(request.result);
	}, function () {
		callback();
	});
};

Database.prototype.updateItems = function (data, callback) {
	this.withStore('readwrite', function (store) {
		Object.keys(data).forEach(function (key) {
			var value = data[key];
			if (value) {
				store.put(value, key);
			} else {
				store.delete(key);
			}
		});
	}, function () {
		callback(true);
	}, function () {
		callback(false);
	});
};

Database.prototype.get = function (key) {
	return new Promise(function (resolve) {
		this.getItem(key, resolve);
	}.bind(this));
};

Database.prototype.update = function (data) {
	return new Promise(function (resolve, reject) {
		this.updateItems(data, function (success) {
			if (success) {
				resolve();
			} else {
				reject();
			}
		});
	}.bind(this));
};

return Database;
})();