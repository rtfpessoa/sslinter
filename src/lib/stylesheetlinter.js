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

    var lessFile = new StyleFile(_this.fileSrc, _this.fileContents, _this.rules, _this.options);
    lessFile.lint(function (_err, _result) {
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

      var filteredMessages = filterImportsMessages(filePath, lintResult.messages, sourceMap);

      //TODO: this should go inside the file or the parser
      if (_.endsWith(filePath, ".less")) {
        injectLessPosition(filteredMessages, sourceMap);
        adjustMessagePosition(lintResult.messages);
      } else if (_.endsWith(filePath, ".scss")) {
        injectSassPosition(filePath, lintResult.messages, sourceMap)
      }
    }

    return lintResult;
  }

  function filterImportsMessages(filePath, messages, sourceMap) {
    return messages.filter(function (message) {
      if (message.line === 0 || message.rollup) return true;

      var source = sourceMap.originalPositionFor({
        line: message.line,
        column: message.col
      }).source;

      if (source === null) return false;

      source && (source = path.resolve(source));

      var isThisFile = (source === filePath);

      // TODO: respect requested imports
      //var stripPath = require('strip-path');
      //var sourceArray = [stripPath(source, process.cwd()), stripPath(source, process.cwd() + '\\')];
      //return isThisFile || grunt.file.isMatch(_this.options.imports, sourceArray);

      return isThisFile;
    });
  }

  function injectLessPosition(messages, sourceMap) {
    messages || (messages = []);
    messages.forEach(function (message) {
      if (message.line !== 0 && !message.rollup) {
        var originalPosition = sourceMap.originalPositionFor({
          line: message.line,
          column: message.col
        });

        message.lessLine = {
          line: originalPosition.line,
          column: originalPosition.column
        };

        message.sourceFile = originalPosition.source;
      }
    });

    return messages;
  }

  function adjustMessagePosition(messages) {
    messages || (messages = []);
    messages.forEach(function (message) {
      if (message.lessLine) {
        message.line = message.lessLine.line - 1;
        message.col = message.lessLine.column - 1;
      }

      message.line += 1;
      message.col += 2;
    });

    return messages;
  }

  function injectSassPosition(initialSassPath, messages, sourceMap) {
    messages || (messages = []);
    messages.forEach(function (message) {
      if (message.line !== 0 && !message.rollup) {
        var originalPosition = sourceMap.originalPositionFor({
          line: message.line,
          column: message.col
        });

        message.line = originalPosition.line;
        message.column = originalPosition.column;
        message.sourceFile = originalPosition.source;

        var filenameSize = path.basename(initialSassPath).length;
        var fullPathSize = initialSassPath.length;
        var resDirectory = initialSassPath.substr(0, fullPathSize - filenameSize);
        message.sourceFile = path.resolve(resDirectory, message.sourceFile);
      }
    });

    return messages;
  }

  module.exports = StyleLinter;

}).call(this);
