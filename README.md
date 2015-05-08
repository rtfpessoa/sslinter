# StyleSheetLinter by [rtfpessoa](https://github.com/rtfpessoa)

Thin [CSSLint](https://github.com/CSSLint/csslint.git) wrapper to support LESS and SASS.

Fully [CSSLint](https://github.com/CSSLint/csslint.git) CLI compatible.

* Same CLI interface
* Same rules
* Same formatters
* Supports `.csslintrc`

## Usage

    Usage: sslinter [options]* [file|dir]*
    
    Global Options
      --help                                   Displays this information.
      --format=<format>                        Indicate which format to use for output.
      --list-rules                             Outputs all of the rules available.
      --quiet                                  Only output when errors are present.
      --errors=<rule[,rule]+>                  Indicate which rules to include as errors.
      --warnings=<rule[,rule]+>                Indicate which rules to include as warnings.
      --ignore=<rule[,rule]+>                  Indicate which rules to ignore completely.
      --exclude-list=<file|dir[,file|dir]+>    Indicate which files/directories to exclude from being linted.
      --version                                Outputs the current version number.

## Contribution

All contributions are welcome.

To contribute just send a pull request with your feature,fix,... and it will be reviewed asap.

## License

Copyright 2015 Rodrigo Fernandes. Released under the terms of the MIT license.

### Thanks

I would like to thank the [CSSLint](https://github.com/CSSLint/csslint) team for creating such a great tool,
[jgable](https://github.com/jgable) for [grunt-lesslint](https://github.com/jgable/grunt-lesslint)
which was used as inspiration for this tool and also both [less](https://www.npmjs.com/package/less) and
[node-sass](https://www.npmjs.com/package/node-sass) creator wich provided great parsing tools.
