define(['require', 'module', 'jbinary'], function (requirejs, module, jBinary) {
	'use strict';

	var Repo = jBinary.Repo = function (names, callback) {
		names = names instanceof Array ? names.slice() : [names];

		for (var i = 0, length = names.length; i < length; i++) {
			var name = names[i];
			if (name.indexOf('/') < 0) {
				names[i] = 'jbinary.repo.typeSets/' + name;
			}
		}

		requirejs(names, function () {
			callback.apply(Repo, arguments);
		});
	};

	Repo.getAssociations = function (callback) {
		requirejs(['jbinary.repo.typeSets/associations'], function (associations) {
			callback.call(Repo, associations);
		});
	};

	Repo.getAssociation = function (source, _callback) {
		var callback = function (typeSetName) {
			if (typeSetName) {
				Repo(typeSetName, _callback);
				return true;
			} else {
				return false;
			}
		};

		Repo.getAssociations(function (associations) {
			if (source.name) {
				// extracting only longest extension part
				var longExtension = source.name.match(/^(.*\/)?.*?(\.|$)(.*)$/)[3].toLowerCase();

				if (longExtension) {
					var fileParts = longExtension.split('.');

					// trying everything from longest possible extension to shortest one
					for (var i = 0, length = fileParts.length; i < length; i++) {
						var extension = fileParts.slice(i).join('.');

						if (callback(associations.extensions[extension])) {
							return;
						}
					}
				}
			}

			if (source.type) {
				if (callback(associations.mimeTypes[source.type])) {
					return;
				}
			}

			_callback();
		});
	};

	jBinary.load = function (source, typeSet, _callback) {
		function callback(typeSet) {
			jBinary.loadData(source, function (err, data) {
				err ? _callback(err) : _callback(null, new jBinary(data, typeSet));
			});
		}

		if (arguments.length < 3) {
			_callback = arguments[1];
			var srcInfo;

			if (typeof Blob !== 'undefined' && source instanceof Blob) {
				srcInfo = source;
			} else
			if (typeof source === 'string') {
				var dataParts = source.match(/^data:(.+?)(;base64)?,/);
				srcInfo = dataParts ? {type: dataParts[1]} : {name: source};
			}

			if (srcInfo) {
				Repo.getAssociation(srcInfo, callback);
			} else {
				callback();
			}
		} else {
			typeof typeSet === 'string' ? Repo(typeSet, callback) : callback(typeSet);
		}
	};

	return Repo;
});