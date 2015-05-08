(function () {
  var path = require('path');
  var _ = require('lodash');
  var parser = require('node-sass');

  var StringDecoder = require('string_decoder').StringDecoder;
  var decoder = new StringDecoder('utf8');

  var defaultSassOptions = {
    cleancss: false,
    compress: false,
    dumpLineNumbers: 'comments',
    optimization: null,
    syncImport: true
  };

  function SassParser(fileName, opts) {
    var paths;
    opts = _.defaults(opts || {}, defaultSassOptions);
    paths = [path.dirname(path.resolve(fileName))];

    if (opts.less && opts.less.paths) {
      paths = paths.concat(opts.less.paths);
    }

    this.opts = _.extend({
      file: path.resolve(fileName),
      includePaths: paths,
      sourceMap: true,
      outFile: path.resolve(fileName)
    }, opts);
  }

  SassParser.prototype.parse = function (callback) {
    try {
      var result = parser.renderSync(this.opts);
      result.css = decoder.write(result.css);
      result.map = decoder.write(result.map);

      return callback(null, result);
    } catch (_error) {
      return callback(_error);
    }
  };

  module.exports = SassParser;

}).call(this);
