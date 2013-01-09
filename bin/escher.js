#!/usr/bin/env node

var
  escher = require('../')

, getArg = function(option, fallback){
    var pos = process.argv.indexOf(option);
    if (pos === -1) return fallback;
    return process.argv[pos + 1];
  }

, options = {
    appPath:    process.argv[2]
  , outputDir:  getArg('--output-dir', './build')
  , optimize:   !(process.argv.indexOf('--no-minify') > -1)
  , silent:     (process.argv.indexOf('-s') > -1) || process.argv.indexOf('--silent') > -1
  }
;

if (options.appPath.indexOf('.js') > -1)
  options.appPath = options.appPath.replace('.js', '');

escher(options, function(error){
  if (error) throw error;

  process.exit(0);
});