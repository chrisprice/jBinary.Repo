var productionMode = location.search === '?debug' ? 0 : 1;

require.config({
	paths: {
		'jdataview': [
			'../../jDataView/src/jdataview',
			'//jdataview.github.io/dist/jdataview'
		][productionMode],
		'jbinary': [
			'../../jBinary/src/jbinary',
			'//jdataview.github.io/dist/jbinary'
		][productionMode],
		'jbinary.repo': '../src/jbinary.repo',
		'jbinary.repo.typeSets': 'jbinary.repo/../../typeSets',
		'prettyPrint': [
			'../../prettyPrint.js/prettyprint',
			'//rawgithub.com/RReverser/prettyPrint.js/master/prettyprint'
		][productionMode],
		'domReady': '//cdnjs.cloudflare.com/ajax/libs/require-domReady/2.0.1/domReady',
		'text': '//cdnjs.cloudflare.com/ajax/libs/require-text/2.0.5/text',
		'knockout': '//cdnjs.cloudflare.com/ajax/libs/knockout/2.3.0/knockout-min'
	},
	shim: {
		'prettyPrint': {
			exports: 'prettyPrint'
		}
	}
});

define(['require', 'knockout'], function (require, ko) {
	ko.bindingHandlers.download = {
		init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
			function getInfo(propName) {
				return ko.unwrap(valueAccessor()[propName]);
			}

			var blob;

			ko.applyBindingsToNode(element, {
				text: ko.computed(function () {
					return getInfo('label') || 'Download';
				}),
				attr: {
					href: '#',
					download: ko.computed(function () {
						return (getInfo('name') || '').replace(/.*\/(.*)$/, '$1');
					})
				},
				event: {
					click: function (viewModel, event) {
						if (!/#$/.test(element.href)) return true;

						var binary = getInfo('binary');

						// handy method, but only in IE10 as for now :(
						if ('msSaveOrOpenBlob' in navigator) {
							navigator.msSaveBlob((blob || (blob = new Blob([binary.read('blob', 0)]))), element.download);
						} else {
							element.href = binary.toURI();
							element.target = '_blank';
							return true;
						}
					}
				}
			});
		}
	};

	require(['prettyPrint'], function (prettyPrint) {
		prettyPrint.config.maxDepth = 1;
		prettyPrint.config.maxArray = 100;
		prettyPrint.config.filter = function (key) {
			return key.charAt(0) !== '_';
		};
		
		ko.bindingHandlers.prettyPrint = {
			update: function (element, valueAccessor) {
				element.innerHTML = '';
				element.appendChild(prettyPrint(ko.unwrap(valueAccessor())));
			}
		};
	});

	var viewModel = {
		associations: ko.observable({}),
		type: ko.observable(''),
		config: ko.observable({}),
		binary: ko.observable(null),
		isMenuVisible: ko.observable(false)
	};

	viewModel.data = ko.computed(function () {
		var binary = viewModel.binary();
		return binary ? binary.read('jBinary.all') : null;
	});

	viewModel.loadData = function (source) {
		require(['jbinary', 'jbinary.repo!' + viewModel.type(), 'prettyPrint'], function (jBinary, typeSet, prettyPrint) {
			jBinary.load(source, typeSet, function (err, binary) {
				if (err) return alert(err);
				viewModel.binary(binary);
			});
		});
	};

	viewModel.loadFromLink = function (viewModel, event) {
		var target = event.target || event.srcElement;
		if (target.tagName === 'A') {
			viewModel.loadData(target.href);
		}
	};

	viewModel.loadFromFile = function (viewModel, event) {
		var target = event.target || event.srcElement;
		viewModel.loadData(target.files[0]);
	};

	var titleSuffix = document.title;

	ko.computed(function () {
		var type = viewModel.type();

		document.title = (type ? type.toUpperCase() + ' - ' : '') + titleSuffix;
		viewModel.binary(null);

		if (!type) return;

		require([type + '/demo'], viewModel.config);

		if (!document.getElementById(type + '.html')) {
			(function (callback) {
				require(['text!' + type + '/demo.html'], callback, function () {
					callback('This file type hasn\'t custom demo.');
				});
			})(function (html) {
				var script = document.createElement('script');
				script.id = type + '.html';
				script.type = 'text/html';
				script.text = html;
				document.head.appendChild(script);
			});
		}
	});

	require(['jbinary.repo'], function (Repo) {
		Repo.getAssociations(function (associations) {
			viewModel.associations(associations);
			viewModel.type(location.hash.slice(1));
			viewModel.type.subscribe(function (newType) {
				location.hash = newType || '';
			});
		});
	});

	require(['domReady!'], function () {
		if (!('head' in document)) {
			document.head = document.getElementsByTagName('head')[0];
		}

		ko.applyBindings(viewModel);
	});

	return viewModel;
});