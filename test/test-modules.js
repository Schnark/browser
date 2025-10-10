/*global QUnit, Modules*/
(function () {
"use strict";

QUnit.module('Modules');
QUnit.test('Complete functions', function (assert) {
	var modules = new Modules([
		{
			apply: 'www.example.com',
			id: 1
		},
		{
			apply: ['*.example.*', '*.example'],
			id: 2
		},
		{
			apply: 'https://www.example.com/some-page',
			id: 3
		},
		{
			apply: '??.beispiel.de',
			id: 4
		}
	]);

	function getId (url) {
		return modules.getDefaults(url).id || 0;
	}

	assert.expect(7);
	assert.equal(getId('https://www.example.com/'), 1);
	assert.equal(getId('http://www.example.com/some-page'), 1);
	assert.equal(getId('https://www.example.com/some-page'), 3);
	assert.equal(getId('http://foo.example.com/some-page'), 2);
	assert.equal(getId('https://foo.beispiel.de/'), 0);
	assert.equal(getId('https://fo.beispiel.de/'), 4);
	assert.equal(getId('https://fo.beispiel.dex/'), 0);
});

})();