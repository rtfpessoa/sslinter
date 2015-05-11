#!/usr/bin/env node

/*
 * StyleLinter
 * based on CSSLint cli.js
 * using https://www.npmjs.com/package/less
 * using https://www.npmjs.com/package/node-sass
 */

/*!
 CSSLint
 Copyright (c) 2013 Nicole Sullivan and Nicholas C. Zakas. All rights reserved.

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.

 */

function cli(api) {

  var globalOptions = {
    "help"        : { "format" : "",                       "description" : "Displays this information."},
    "format"      : { "format" : "<format>",               "description" : "Indicate which format to use for output."},
    "list-rules"  : { "format" : "",                       "description" : "Outputs all of the rules available."},
    "quiet"       : { "format" : "",                       "description" : "Only output when errors are present."},
    "errors"      : { "format" : "<rule[,rule]+>",         "description" : "Indicate which rules to include as errors."},
    "warnings"    : { "format" : "<rule[,rule]+>",         "description" : "Indicate which rules to include as warnings."},
    "ignore"      : { "format" : "<rule[,rule]+>",         "description" : "Indicate which rules to ignore completely."},
    "exclude-list": { "format" : "<file|dir[,file|dir]+>", "description" : "Indicate which files/directories to exclude from being linted."},
    "version"     : { "format" : "",                       "description" : "Outputs the current version number."}
  };

  //-------------------------------------------------------------------------
  // Helper functions
  //-------------------------------------------------------------------------

  /**
   * Returns an array of messages for a particular type.
   * @param messages {Array} Array of CSS Lint messages.
   * @param type {String} The type of message to filter on.
   * @return {Array} An array of matching messages.
   */
  function pluckByType(messages, type) {
    return messages.filter(function (message) {
      return message.type === type;
    });
  }

  /**
   * Returns a ruleset object based on the CLI options.
   * @param options {Object} The CLI options.
   * @param ruleset {Object} A ruleset object.
   * @return {Object} A ruleset object.
   */
  function gatherRules(options, ruleset) {
    var warnings = options.rules || options.warnings,
      errors = options.errors;

    if (warnings) {
      ruleset = ruleset || {};
      warnings.split(",").forEach(function (value) {
        ruleset[value] = 1;
      });
    }

    if (errors) {
      ruleset = ruleset || {};
      errors.split(",").forEach(function (value) {
        ruleset[value] = 2;
      });
    }

    return ruleset;
  }

  /**
   * Filters out rules using the ignore command line option.
   * @param options {Object} the CLI options
   * @return {Object} A ruleset object.
   */
  function filterRules(options) {
    var ignore = options.ignore,
      ruleset = null;

    if (ignore) {
      ruleset = CSSLint.getRuleset();
      ignore.split(",").forEach(function (value) {
        ruleset[value] = 0;
      });
    }

    return ruleset;
  }


  /**
   * Filters out files using the exclude-list command line option.
   * @param files   {Array}  the list of files to check for exclusions
   * @param options {Object} the CLI options
   * @return {Array} A list of files
   */
  function filterFiles(files, options) {
    var excludeList = options["exclude-list"],
      excludeFiles = [],
      filesToLint = files.map(api.getFullPath),
      fullPath;


    if (excludeList) {
      // Build up the exclude list, expanding any directory exclusions that were passed in
      excludeList.split(",").forEach(function (value) {
        if (api.isDirectory(value)) {
          excludeFiles = excludeFiles.concat(api.getFiles(value));
        } else {
          excludeFiles.push(value);
        }
      });

      // Remove the excluded files from the list of files to lint
      excludeFiles.forEach(function (value) {
        fullPath = api.getFullPath(value);
        if (filesToLint.indexOf(fullPath) > -1) {
          filesToLint.splice(filesToLint.indexOf(fullPath), 1);
        }
      });
    }

    return filesToLint;
  }

  /**
   * Outputs all available rules to the CLI.
   * @return {void}
   */
  function printRules() {
    api.print("");
    var rules = CSSLint.getRules();
    rules.forEach(function (rule) {
      api.print(rule.id + "\n  " + rule.desc + "\n");
    });
  }

  /**
   * Given a file name and options, run verification and print formatted output.
   * @param {String} relativeFilePath absolute file location
   * @param {Object} options for processing
   * @return {Number} exit code
   */
  function processFile(relativeFilePath, options) {
    var exitCode = 0;
    var formatter = CSSLint.getFormatter(options.format || "text");

    var input = api.readFile(relativeFilePath);
    if (!input) {
      printError(formatter, relativeFilePath, "Could not read file data. Is the file empty?");
      return exitCode = 1;
    }

    var rules = gatherRules(options, filterRules(options));
    var ssLinter = new SSLinter(relativeFilePath, input, rules, options);
    var lintOutput = ssLinter.lint();

    if (lintOutput.error) {
      printError(formatter, relativeFilePath, lintOutput.error.message);
      return exitCode = 2;
    }

    var result = lintOutput.result;
    result || (result = {});
    result.messages || (result.messages = []);

    // filter duplicate issues caused by less/sass compilation
    result.messages = _.uniq(result.messages, function (elem) {
      return elem.line + elem.message + elem.sourceFile;
    });

    options.fullPath = api.getFullPath(relativeFilePath);

    // group messages by file path
    var messageGroups = _.groupBy(result.messages, function (elem) {
      return elem.sourceFile ? elem.sourceFile : relativeFilePath;
    });

    // output accomulator
    var output = "";

    for (var filePath in messageGroups) if (messageGroups.hasOwnProperty(filePath)) {
      var tmpResult = _.clone(result, true);
      tmpResult.messages = messageGroups[filePath];

      output += formatter.formatResults(tmpResult, filePath, options);
    }

    if (output.length) api.print(output);

    if (result.messages.length > 0 && pluckByType(result.messages, "error").length > 0) {
      exitCode = 3;
    }

    return exitCode;
  }

  /**
   * Given a formatter, a file path and a message, print formatted output.
   * @param {Object} formatter object
   * @param {String} filePath file location
   * @param {String} message to print
   * @return {Number} exit code
   */
  function printError(formatter, filePath, message) {
    if (formatter.readError) {
      api.print(formatter.readError(filePath, message));
    } else {
      api.print("sslinter:" + filePath + ":> " + message);
    }
  }


  /**
   * Outputs the help screen to the CLI.
   * @return {void}
   */
  function outputHelp() {
    var lenToPad = 40,
      toPrint = '',
      formatString = '';

    api.print([
      "\nUsage: sslinter [options]* [file|dir]*",
      " ",
      "Global Options"
    ].join("\n"));

    for (var optionName in globalOptions) {
      if (globalOptions.hasOwnProperty(optionName)) {
        // Print the option name and the format if present
        toPrint += "  --" + optionName;
        if (globalOptions[optionName].format !== "") {
          formatString = '=' + globalOptions[optionName].format;
          toPrint += formatString;
        } else {
          formatString = '';
        }

        // Pad out with the appropriate number of spaces
        toPrint += new Array(lenToPad - (optionName.length + formatString.length)).join(' ');

        // Print the description
        toPrint += globalOptions[optionName].description + "\n";
      }
    }
    api.print(toPrint);
  }

  /**
   * Given an Array of filenames, print wrapping output and process them.
   * @param fileArray {Array} filenames list
   * @param options {Object} options object
   * @return {Number} exit code
   */
  function processFiles(fileArray, options) {
    var exitCode = 0,
      formatId = options.format || "text",
      formatter,
      files = filterFiles(fileArray, options),
      output;

    if (!files.length) {
      api.print("sslinter: No files specified.");
      exitCode = 1;
    } else {
      if (!CSSLint.hasFormat(formatId)) {
        api.print("sslinter: Unknown format '" + formatId + "'. Cannot proceed.");
        exitCode = 1;
      } else {
        formatter = CSSLint.getFormatter(formatId);

        output = formatter.startFormat();
        if (output) {
          api.print(output);
        }

        files.forEach(function (file) {
          if (exitCode === 0) {
            exitCode = processFile(file, options);
          } else {
            processFile(file, options);
          }
        });

        output = formatter.endFormat();
        if (output) {
          api.print(output);
        }
      }
    }
    return exitCode;
  }


  function processArguments(args, options) {
    var arg = args.shift(),
      argName,
      parts,
      files = [];

    while (arg) {
      if (arg.indexOf("--") === 0) {
        argName = arg.substring(2);

        if (argName.indexOf("=") > -1) {
          parts = argName.split("=");
          options[parts[0]] = parts[1];
        } else {
          options[argName] = true;
        }

      } else {

        //see if it's a directory or a file
        if (api.isDirectory(arg)) {
          files = files.concat(api.getFiles(arg));
        } else {
          files.push(arg);
        }
      }
      arg = args.shift();
    }

    options.files = files;
    return options;
  }

  function validateOptions(options) {
    for (var option_key in options) if (options.hasOwnProperty(option_key)) {
      if (!globalOptions.hasOwnProperty(option_key) && option_key !== 'files') {
        api.print(option_key + ' is not a valid option. Exiting...');
        outputHelp();
        api.quit(0);
      }
    }
  }

  function readConfigFile(options) {
    var data = api.readFile(api.getFullPath(".csslintrc"));
    if (data) {
      options = processArguments(data.split(/[\s\n\r]+/m), options);
    }

    return options;
  }


  //-----------------------------------------------------------------------------
  // Process command line
  //-----------------------------------------------------------------------------

  var args = api.args,
    argCount = args.length,
    options = {};

  // first look for config file .csslintrc
  options = readConfigFile(options);

  // Command line arguments override config file
  options = processArguments(args, options);

  if (options.help || argCount === 0) {
    outputHelp();
    api.quit(0);
  }

  // Validate options
  validateOptions(options);

  if (options.version) {
    api.print("SSLinter=v" + appVersion);
    api.print("CSSLint=v" + CSSLint.version);
    api.quit(0);
  }

  if (options["list-rules"]) {
    printRules();
    api.quit(0);
  }

  api.quit(processFiles(options.files, options));
}

/*
 * StyleSheetLinter Node.js Command Line Interface
 */

require('pkginfo')(module, 'version');
var appVersion = module.exports.version;

var fs = require("fs");
var path = require("path");
var _ = require("lodash");

var CSSLint = require('./lib/csslint-extended').CSSLint;
var SSLinter = require('./lib/stylesheetlinter');

cli({
  args: process.argv.slice(2),

  print: function (message) {
    fs.writeSync(1, message + "\n");
  },

  quit: function (code) {
    process.exit(code || 0);
  },

  isDirectory: function (name) {
    try {
      return fs.statSync(name).isDirectory();
    } catch (ex) {
      return false;
    }
  },

  getFiles: function (dir) {
    var files = [];

    try {
      fs.statSync(dir);
    } catch (ex) {
      return [];
    }

    function traverse(dir, stack) {
      stack.push(dir);

      fs.readdirSync(stack.join("/")).forEach(function (file) {
        var path = stack.concat([file]).join("/"),
          stat = fs.statSync(path);

        if (file[0] == ".") return;
        else if (stat.isFile() && /\.(css|less|scss)$/.test(file)) files.push(path);
        else if (stat.isDirectory()) traverse(file, stack);
      });

      stack.pop();
    }

    traverse(dir, []);

    return files;
  },

  getFullPath: function (filename) {
    return path.resolve(process.cwd(), filename);
  },

  readFile: function (filename) {
    try {
      return fs.readFileSync(filename, "utf-8");
    } catch (ex) {
      return "";
    }
  }
});
