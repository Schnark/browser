/*global MODULES: true*/
MODULES = [
	{
		apply: 'html.duckduckgo.com',
		postget: true,
		addNoJS: ['sites/duckduckgo.js'],
		addJS: ['sites/duckduckgo.js']
	},
	{
		apply: 'www.ecosia.org',
		addCSS: ['sites/ecosia.css']
	},
	{
		apply: '*.github.io',
		cors: true
	},
	{
		apply: 'developer.mozilla.org',
		addCSS: ['sites/mdn.css']
	},
	{
		apply: 'www.swr.de',
		cors: true,
		addCSS: ['sites/swr.css']
	},
	{
		apply: 'www.tagesschau.de',
		cors: true
	},
	{
		apply: 'www.vatican.va',
		addCSS: ['sites/vatican.css']
	},
	{
		apply: [
			'*.wikipedia.org',
			'*.wikisource.org',
			'wikisource.org',
			'*.wikibooks.org',
			'*.wiktionary.org',
			'*.wikinews.org',
			'*.wikiverstiy.org',
			'*.wikiquote.org',
			'*.wikivoyage.org',
			'*.wikidata.org',
			'wikidata.org',
			'*.wikimedia.org',
			'www.mediawiki.org',
			'wikimediafoundation.org'
		],
		cors: true,
		cert: true
	},
	{
		apply: 'm.xkcd.com',
		addNoJS: ['sites/xkcd.js']
	}
];