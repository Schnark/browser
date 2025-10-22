window.onload = function () {
	[].forEach.call(document.querySelectorAll('a'), function (a) {
		var href = a.href || '', result;
		result = /^(?:https?:)?\/\/duckduckgo.com\/l\/\?uddg=([^&]+)/.exec(href);
		if (result) {
			try {
				a.href = decodeURIComponent(result[1]);
			} catch (e) {
			}
		}
	});
};