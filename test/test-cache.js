/*global QUnit, Cache*/
(function () {
"use strict";

QUnit.module('Cache.getInfo');
QUnit.test('text', function (assert) {
	function makeRes (data) {
		var result = {}, i;
		for (i = 0; i < data.length; i++) {
			result['debug:res-' + i] = {
				d: data[i].cached ? 0 : -1,
				live: data[i].live
			};
		}
		return result;
	}

	var tests = [
		{
			name: 'Uncached, single',
			data: makeRes([{cached: false}]),
			text: 'The page is currently not cached.'
		},
		{
			name: 'Uncached, with sub-resource',
			data: makeRes([{cached: false, live: 2}, {cached: false, live: 0}]),
			text: 'The page is currently not cached.'
		},
		{
			name: 'Uncached, with partially cached sub-resources',
			data: makeRes([{cached: false, live: 2}, {cached: true, live: 0}, {cached: false, live: 0}]),
			text: 'The page is not cached, but some resources are.'
		},
		{
			name: 'Uncached, with partially cached sub-resources (one not embedded)',
			data: makeRes([{cached: false, live: 4}, {cached: true, live: 0}]),
			text: 'The page is not cached, but some resources are.'
		},
		{
			name: 'Uncached, with cached sub-resources',
			data: makeRes([{cached: false, live: 2}, {cached: true, live: 0}, {cached: true, live: 0}]),
			text: 'The page is not cached, but all basic resources are.'
		},
		{
			name: 'Cached, with uncached sub-resources',
			data: makeRes([{cached: true, live: 2}, {cached: false, live: 0}, {cached: false, live: 0}]),
			text: 'The page is cached, but some resources are not.'
		},
		{
			name: 'Cached, with partially cached sub-resources',
			data: makeRes([{cached: true, live: 2}, {cached: false, live: 0}, {cached: true, live: 0}]),
			text: 'The page is cached, but some resources are not.'
		},
		{
			name: 'Cached, with partially cached sub-resources (one not embedded)',
			data: makeRes([{cached: true, live: 4}, {cached: true, live: 0}, {cached: true, live: 0}]),
			text: 'The page is cached, but some resources are not.'
		},
		{
			name: 'Cached, with no sub-resources, but images',
			data: makeRes([{cached: true, live: 2}]),
			text: 'The page and its resources are cached, but not the images.'
		},
		{
			name: 'Cached, with cached sub-resources, but images',
			data: makeRes([{cached: true, live: 2}, {cached: true, live: 0}]),
			text: 'The page and its resources are cached, but not the images.'
		},
		{
			name: 'Cached, with cached sub-resources, but images in sub-resource',
			data: makeRes([{cached: true, live: 0}, {cached: true, live: 2}]),
			text: 'The page and its resources are cached, but not the images.'
		},
		{
			name: 'Cached, with cached sub-resources, but media',
			data: makeRes([{cached: true, live: 1}, {cached: true, live: 0}]),
			text: 'The page and its resources are cached, but not the media.'
		},
		{
			name: 'Completely cached',
			data: makeRes([{cached: true, live: 0}, {cached: true, live: 0}]),
			text: 'The page and all its resources are cached.'
		}
	], i;
	assert.expect(tests.length);
	for (i = 0; i < tests.length; i++) {
		assert.strictEqual(Cache.getInfo(tests[i].data).text, tests[i].text, tests[i].name);
	}
});
QUnit.test('dates', function (assert) {
	var HOUR = 1000 * 60 * 60,
		DAY = 24 * HOUR,
		tests = [
			{
				name: 'Just now',
				d0: 5,
				d1: 10,
				text: 'The cached resources are less than an hour old.'
			},
			{
				name: '1 hour',
				d0: HOUR,
				d1: 1.2 * HOUR,
				text: 'The cached resources are 1 hour old.'
			},
			{
				name: '5 hour',
				d0: 4.8 * HOUR,
				d1: 5.2 * HOUR,
				text: 'The cached resources are 5 hours old.'
			},
			{
				name: '1 day',
				d0: DAY,
				d1: 1.2 * DAY,
				text: 'The cached resources are 1 day old.'
			},
			{
				name: '5 day',
				d0: 4.8 * DAY,
				d1: 5.2 * DAY,
				text: 'The cached resources are 5 days old.'
			},
			{
				name: '1 month',
				d0: 30 * DAY,
				d1: 33 * DAY,
				text: 'The cached resources are 1 month old.'
			},
			{
				name: '5 months',
				d0: 150 * DAY,
				d1: 160 * DAY,
				text: 'The cached resources are 5 months old.'
			},
			{
				name: '1 year',
				d0: 360 * DAY,
				d1: 370 * DAY,
				text: 'The cached resources are 1 year old.'
			},
			{
				name: '5 years',
				d0: 1800 * DAY,
				d1: 1900 * DAY,
				text: 'The cached resources are 5 years old.'
			},
			{
				name: '1--5 hours',
				d0: HOUR,
				d1: 5.2 * HOUR,
				text: 'The cached resources are between 1 hour and 5 hours old.'
			},
			{
				name: '1--5 hours (backwards)',
				d0: 4.8 * HOUR,
				d1: 1.2 * HOUR,
				text: 'The cached resources are between 1 hour and 5 hours old.'
			}
		], i;
	function makeRes (data) {
		return {
			'debug:a': {d: Date.now() - data.d0},
			'debug:b': {d: Date.now() - data.d1}
		};
	}
	assert.expect(tests.length);
	for (i = 0; i < tests.length; i++) {
		assert.strictEqual(Cache.getInfo(makeRes(tests[i])).dates, tests[i].text, tests[i].name);
	}
});
QUnit.test('buttons', function (assert) {
	function makeRes (data) {
		var result = {}, i;
		for (i = 0; i < data.length; i++) {
			result['debug:res-' + i] = {
				d: data[i].cached ? 0 : -1,
				live: data[i].live
			};
		}
		return result;
	}

	var tests = [
		{
			name: 'Single uncached resource',
			data: makeRes([{cached: false, live: 0}]),
			buttons: 'add: 1'
		},
		{
			name: 'Uncached with live CSS (and possibly images)',
			data: makeRes([{cached: false, live: 4}]),
			buttons: 'add: 0; add: 1; add: 2'
		},
		{
			name: 'Uncached without images, but CSS',
			data: makeRes([{cached: false, live: 1}, {cached: false, live: 0}]),
			buttons: 'add: 0; add: 1'
		},
		{
			name: 'Uncached with CSS and images',
			data: makeRes([{cached: false, live: 2}, {cached: false, live: 0}]),
			buttons: 'add: 0; add: 1; add: 2'
		},
		{
			name: 'Uncached without images, but partially cached CSS',
			data: makeRes([{cached: false, live: 0}, {cached: true, live: 0}, {cached: false, live: 0}]),
			buttons: 'remove: 0; update: 0; add: 1'
		},
		{
			name: 'Uncached without images, but cached CSS',
			data: makeRes([{cached: false, live: 0}, {cached: true, live: 0}]),
			buttons: 'remove: 0; update: 0; add: 1'
		},
		{
			name: 'Uncached with cached CSS and images',
			data: makeRes([{cached: false, live: 2}, {cached: true, live: 0}]),
			buttons: 'remove: 0; update: 0; add: 1; add: 2'
		},
		{
			name: 'Cached single resource',
			data: makeRes([{cached: true, live: 0}]),
			//'remove: 1; update: 1' makes more sense, but it should not matter
			buttons: 'remove: 2; update: 2'
		},
		{
			name: 'Cached with live CSS (and possibly images)',
			data: makeRes([{cached: true, live: 4}]),
			buttons: 'remove: 1; update: 1; add: 2'
		},
		{
			name: 'Cached without images, but CSS',
			data: makeRes([{cached: true, live: 1}, {cached: false, live: 0}]),
			//'remove: 1; update: 1' makes more sense, but it should not matter
			buttons: 'remove: 2; update: 2'
		},
		{
			name: 'Cached with CSS and images',
			data: makeRes([{cached: true, live: 2}, {cached: false, live: 0}]),
			buttons: 'remove: 1; update: 1; add: 2'
		},
		{
			name: 'Cached without uncached images, but partially cached CSS',
			data: makeRes([{cached: true, live: 0}, {cached: true, live: 0}, {cached: false, live: 0}]),
			buttons: 'remove: 2; update: 2'
		},
		{
			name: 'Cached without uncached images, but cached CSS',
			data: makeRes([{cached: true, live: 0}, {cached: true, live: 0}]),
			buttons: 'remove: 2; update: 2'
		},
		{
			name: 'Cached with cached CSS and images',
			data: makeRes([{cached: true, live: 2}, {cached: true, live: 0}]),
			buttons: 'remove: 1; update: 1; add: 2'
		}
	], i;

	function buttonsToData (buttons) {
		return buttons.map(function (button) {
			return button.action[0] + ': ' + button.action[1];
		}).join('; ');
	}

	assert.expect(tests.length);
	for (i = 0; i < tests.length; i++) {
		assert.strictEqual(
			buttonsToData(Cache.getInfo(tests[i].data).buttons),
			tests[i].buttons,
			tests[i].name
		);
	}
});

QUnit.module('Cache');
function makeRes (data) {
	var result = {};
	Object.keys(data).forEach(function (key) {
		result[key] = {
			embed: data[key],
			blob: 1
		};
	});
	return result;
}
QUnit.test('Basic function', function (assert) {
	var cache = new Cache();
	assert.expect(5);
	assert.deepEqual(cache.test(), [], 'cache is empty at start');
	cache.add('a', makeRes({a: []}));
	assert.deepEqual(cache.test(), ['a'], 'a added to cache');
	cache.add('b', makeRes({b: ['a', 'c'], a: [], c: ['d'], d: []}));
	assert.deepEqual(cache.test(), ['a', 'b', 'c', 'd'], 'b added with dependencies');
	cache.remove('a');
	assert.deepEqual(cache.test(), ['a', 'b', 'c', 'd'], 'removing a still keeps it as dependency for b');
	cache.remove('b');
	assert.deepEqual(cache.test(), [], 'removing b removes everthing');
});
QUnit.test('Adding with different dependencies', function (assert) {
	var cache = new Cache();
	assert.expect(2);
	cache.add('a', makeRes({a: []}));
	cache.add('a', makeRes({a: ['b'], b: []}));
	assert.deepEqual(cache.test(), ['a', 'b'], 'a added to cache with dependencies');
	cache.remove('a');
	assert.deepEqual(cache.test(), [], 'a removed with dependencies');
});
QUnit.test('Dependencies', function (assert) {
	var cache = new Cache();
	assert.expect(4);
	cache.add('a', makeRes({a: ['b'], b: ['c'], c: []}));
	cache.add('b', makeRes({b: ['c'], c: []}));
	cache.add('d', makeRes({d: ['c'], c: []}));
	assert.deepEqual(cache.test(), ['a', 'b', 'c', 'd'], 'resources chached with dependencies');
	cache.remove('a');
	assert.deepEqual(cache.test(), ['b', 'c', 'd'], 'a removed');
	cache.remove('d');
	assert.deepEqual(cache.test(), ['b', 'c'], 'd removed');
	cache.remove('b');
	assert.deepEqual(cache.test(), [], 'all removed');
});
QUnit.test('Updates', function (assert) {
	var cache = new Cache();
	assert.expect(4);
	cache.add('a', makeRes({a: ['b', 'c'], b: ['d'], c: [], d: []}));
	assert.deepEqual(cache.test(), ['a', 'b', 'c', 'd'], 'a added with dependencies');
	cache.add('a2', makeRes({a2: ['b', 'c'], b: ['d'], c: [], d: []}));
	assert.deepEqual(cache.test(), ['a', 'a2', 'b', 'c', 'd'], 'a2 added with dependencies');
	cache.update('a', makeRes({a: ['b', 'e'], b: [], e: ['f'], f: []}));
	assert.deepEqual(cache.test(), ['a', 'a2', 'b', 'c', 'e', 'f'], 'a updated with changed dependencies');
	cache.remove('a');
	assert.deepEqual(cache.test(), ['a2', 'b', 'c'], 'a removed with dependencies');
});
QUnit.test('Manual removing', function (assert) {
	var cache = new Cache();
	assert.expect(3);
	cache.add('a', makeRes({a: ['b'], b: ['c'], c: []}));
	assert.deepEqual(cache.test(), ['a', 'b', 'c'], 'a added with dependencies');
	cache.remove('b');
	assert.deepEqual(cache.test(), ['a'], 'b manually removed with dependencies');
	cache.remove('a');
	assert.deepEqual(cache.test(), [], 'a removed');
});
QUnit.test('Manual updating', function (assert) {
	var cache = new Cache();
	assert.expect(3);
	cache.add('a', makeRes({a: ['b'], b: ['c'], c: []}));
	assert.deepEqual(cache.test(), ['a', 'b', 'c'], 'a added with dependencies');
	cache.update('b', makeRes({b: ['c'], c: []}));
	assert.deepEqual(cache.test(), ['a', 'b', 'c'], 'b manually updated');
	cache.remove('a');
	assert.deepEqual(cache.test(), [], 'a removed');
});
})();
