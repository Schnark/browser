//copy of inline code from m.xkcd.com
window.onload = function () {
	updateFunction = function(){el = document.getElementById("altText"); el.style.display = (el.style.display != "none" ? "none" : "block");}
	document.getElementById("comic").onclick = updateFunction;
	document.getElementById("altTextLink").onclick = updateFunction;
	document.getElementById("altText").style.display = "none";
}