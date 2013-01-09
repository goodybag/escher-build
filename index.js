var
  fs            = require('fs')
, sys           = require('sys')
, childProcess  = require('child_process')
;

module.exports = function(appPath, callback){
  var
    command = "jam compile"

  , getArg = function(option, fallback){
      var pos = process.argv.indexOf(option);
      if (pos === -1) return fallback;
      return process.argv[pos + 1];
    }

  , onFileRead = function(error, data){
      if (error) return callback(error);

      // TODO:
      // Need to find what variable escher is assigned to
      var config = data.substring(data.indexOf("escher.config({") + "escher.config(".length);
      config = config.substring(0, config.indexOf(");"));
      // It's not valid json so... eval!!
      config = eval('(' + config + ')');

      onConfigParsed(config);
    }

  , onConfigParsed = function(config){
      includeRootApp();
      includeEscherApps(config);
      includeJamPackages(require(process.cwd() + '/jam/require.config.js'));

      command += " \\ \n -o " + getArg('-o', 'build.js');

      if (getArg('--show-output', true)) console.log(command);

      if (getArg('--output-only', false)) return;

      execute();
    }

  , includeRootApp = function(){
      command += " \\ \n -i " + appPath;
    }

  , includeEscherApps = function(config){
      // compile command for escher apps
      for (var i = config.apps.length - 1; i >= 0; i--){
        command += " \\ \n -i " + config.apps[i] + "/package.js"
      }
    }

  , includeJamPackages = function(config){
      // compile command for jam packages
      for (var i = config.packages.length - 1; i >= 0; i--){
        command += " \\ \n -i " + config.packages[i].name
        // command += " \\ \n -i " + config.packages[i].location + "/" + (config.packages[i].main || "main.js")
      }
    }

  , execute = function(){
      command = command.replace(/\\/g, "");
      command = command.replace(/\n/g, "");
      command = command.replace(/   /g, " ");
      childProcess.exec(command, function(error, stdout){
        sys.puts(stdout);
      });
    }
  ;

  fs.readFile(appPath, 'utf-8', onFileRead);
};