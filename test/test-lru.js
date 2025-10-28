/*global QUnit, LRU*/
(function () {
"use strict";

QUnit.module('LRU');
QUnit.test('Complete functions', function (assert) {
	var lru = new LRU(3);
	lru.set('a', 'A');
	lru.set('b', 'B');
	lru.set('c', 'C');
	lru.set('d', 'D');
	assert.expect(6);
	assert.strictEqual(lru.get('a'), undefined, 'a no longer in cache');
	assert.strictEqual(lru.get('b'), 'B', 'b retrieved from cache');
	lru.set('e', 'E');
	assert.strictEqual(lru.get('b'), 'B', 'b still in cache');
	assert.strictEqual(lru.get('c'), undefined, 'c no longer in cache');
	assert.strictEqual(lru.get('e'), 'E', 'e in cache');
	lru.remove('e');
	assert.strictEqual(lru.get('e'), undefined, 'e removed from cache');
});

})();
