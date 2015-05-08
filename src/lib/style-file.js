(function () {
  var crypto = require('crypto');
  var chalk = require('chalk');
  var _ = require('lodash');

  var LessParser = require('./less-parser');
  var SassParser = require('./sass-parser');
  var CSSLint = require('./csslint-extended').CSSLint;

  function StyleFile(filePath, contents, rules, options) {
    this.filePath = filePath;
    this.fileContents = contents;
    this.lintRules = rules;
    this.options = options != null ? options : {};
    this.options.sourceMap = true;
  }

  StyleFile.prototype.lint = function (callback) {
    return this.getCss((function (_this) {
      return function (err, output) {
        if (err) {
          return callback(new Error("Error parsing " + (chalk.yellow(_this.filePath)) + ": " + err.message));
        }

        var lintResult;
        try {
          lintResult = CSSLint.verify(output.css, _this.lintRules);
        } catch (_err) {
          return callback(new Error("Error linting " + (chalk.yellow(_this.filePath)) + ": " + _err.message));
        }

        var result = {
          file: _this.filePath,
          less: _this.fileContents,
          css: output.css,
          sourceMap: output.map
        };

        var ref;
        if ((lintResult != null ? (ref = lintResult.messages) != null ? ref.length : void 0 : void 0) > 0) {
          result.lint = lintResult;
        }

        return callback(null, result);
      };
    })(this));
  };

  StyleFile.prototype.getCss = function (callback) {
    if (!this.fileContents) return callback(null, '');

    var parser;
    if (_.endsWith(this.filePath, ".scss")) {

      parser = new SassParser(this.filePath, this.options);
      return parser.parse(callback);

    } else if (_.endsWith(this.filePath, ".less")) {

      parser = new LessParser(this.filePath, this.options);
      return parser.parse(this.fileContents, callback);

    } else {
      return callback(null, {"css": this.fileContents});
    }

  };

  module.exports.LessFile = StyleFile;

}).call(this);
