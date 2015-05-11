(function () {

  var _ = require('lodash');
  var chalk = require('chalk');
  var crypto = require('crypto');
  var path = require('path');

  var SourceMapConsumer = require('source-map').SourceMapConsumer;

  var StyleFile = require('./style-file').LessFile;

  function StyleLinter(file, contents, rules, options) {
    this.fileSrc = file;
    this.fileContents = contents;
    this.rules = rules;
    this.options = options;
  }

  StyleLinter.prototype.lint = function () {
    var _this = this;

    _.assign(_this.options, {
      less: {},
      sass: {},
      csslint: {},
      imports: void 0
    });

    var result = {};

    var ssFile = new StyleFile(_this.fileSrc, _this.fileContents, _this.rules, _this.options);
    ssFile.lint(function (_err, _result) {
      if (_err != null) result.error = _err;
      else result = _result;
    });

    if (result.error) return result;

    return {"result": processResult(_this.fileSrc, result)};
  };

  function processResult(filePath, result) {
    result || (result = {});
    var lintResult = result.lint;
    if (lintResult && result.sourceMap) {
      var sourceMap = new SourceMapConsumer(result.sourceMap);

      if (_.endsWith(filePath, ".less")) {
        lintResult.messages = injectLessPosition(lintResult.messages, sourceMap);
      } else if (_.endsWith(filePath, ".scss")) {
        lintResult.messages = injectSassPosition(filePath, lintResult.messages, sourceMap)
      } else {
        lintResult.messages = [];
      }
    }

    return lintResult;
  }

  function injectLessPosition(messages, sourceMap) {
    messages || (messages = []);
    return _.map(messages, function (message) {
      if (message.line > 0 && !message.rollup) {
        var originalPosition = sourceMap.originalPositionFor({
          line: message.line,
          column: message.col
        });

        message.lessLine = {
          line: originalPosition.line,
          column: originalPosition.column
        };

        message.sourceFile = originalPosition.source;
      } else {
        // all the generic messages go in the first line
        message.line = 0;
        message.col = 0;
      }

      if (message.lessLine) {
        message.line = message.lessLine.line - 1;
        message.col = message.lessLine.column - 1;
      }

      message.line += 1;
      message.col += 2;

      return message;
    });
  }

  function injectSassPosition(initialSassPath, messages, sourceMap) {
    messages || (messages = []);
    return _.map(messages, function (message) {
      if (message.line !== 0 && !message.rollup) {
        var originalPosition = sourceMap.originalPositionFor({
          line: message.line,
          column: message.col
        });

        message.line = originalPosition.line;
        message.column = originalPosition.column;
        message.sourceFile = originalPosition.source;

        // convert relative path to absolute path
        var filenameSize = path.basename(initialSassPath).length;
        var fullPathSize = initialSassPath.length;
        var resDirectory = initialSassPath.substr(0, fullPathSize - filenameSize);
        message.sourceFile = path.resolve(resDirectory, message.sourceFile);
      } else {
        // all the generic messages go in the first line
        message.line = 1;
        message.col = 1;
      }

      return message;
    });
  }

  module.exports = StyleLinter;

}).call(this);
