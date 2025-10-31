(function () {
"use strict";

function toggle (e) {
	var el = document.querySelector(this.dataset.target);
	if (el) {
		el.hidden = !el.hidden;
		if (!el.hidden) {
			//TODO should we keep something? add something instead?
			//add the classes again on hide?
			el.className = '';
		}
		this.className = el.hidden ? 'collapsed' : '';
	}
}

function initToggle () {
	var buttons = document.querySelectorAll('button[data-target]'), i;
	for (i = 0; i < buttons.length; i++) {
		buttons[i].addEventListener('click', toggle);
	}
}

document.addEventListener('DOMContentLoaded', initToggle);

})();