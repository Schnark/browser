/*global ContextMenu: true*/
ContextMenu =
(function () {
"use strict";

function ContextMenu (container) {
	this.container = container;
	this.buttons = container.querySelector('.context-menu-buttons');
	this.hide();
	container.querySelector('.context-menu-cancel').addEventListener('click', function () {
		this.hide();
	}.bind(this));
	this.buttons.addEventListener('click', function (e) {
		var index = e.target.dataset.index;
		if (index) {
			this.hide();
			this.callback(Number(index));
		}
	}.bind(this));
}

ContextMenu.prototype.show = function (buttons, callback) {
	this.callback = callback;
	this.buttons.innerHTML = buttons.map(function (text, i) {
		return '<li><button data-index="' + i + '">' + text + '</button></li>';
	}).join('\n');
	this.container.hidden = false;
};

ContextMenu.prototype.hide = function () {
	this.container.hidden = true;
};

return ContextMenu;
})();