var
  fs            = require('fs')
, sys           = require('sys')
, childProcess  = require('child_process')
, async         = require('async')
, parser        = require('uglify-js').parser
, uglify        = require('uglify-js').uglify
, wrench        = require('wrench')

  // Global options - I promise to fulfill!
, options

, getEscherConfig = function(callback){
    appPath = options.appPath;

    fs.readFile(appPath + '.js', 'utf-8', function(error, data){
      if (error) return callback(error);

      // Parse code into a predictable format
      data = uglify.gen_code(parser.parse(data, true));

      // Get the variable that escher is assigned to
      var name = data.substring(0, data.indexOf('=require("escher")')).split(/ |,/g);
      name = name[name.length - 1];

      // Parse the config
      var config = data.substring(data.indexOf(name + ".config({") + (name + "config({").length);
      config = config.substring(0, config.indexOf(");"));

      // Parse the array of apps
      config = eval('(' + config + ')');

      return callback(null, config);
    });
  }

, getJamConfig = function(callback){
    var config = require(process.cwd() + '/jam/require.config.js');
    if (callback) return callback(null, config);
    return config;
  }

// Nope
// , replaceDotJsInDefines = function(file, callback){
//     fs.readFile(file, 'utf-8', function(error, data){
//       if (error) return callback(error);

//       console.log(data.replace(/define\(.*\.js/g));
//       callback();
//     });
//   }

, compileMain = function(escherConfig, jamConfig, callback){
    var
      command = "jam compile"
    ;

    getEscherPackages(escherConfig, function(error, escherPackages){
      if (error) return callback(error);

      // Include root app
      command += " \\ \n -i " + options.appPath;

      // compile command for escher apps
      for (var i = escherConfig.apps.length - 1; i >= 0; i--){
        command += " \\ \n -i " + escherConfig.apps[i] + "/package"
      }

      // Include application routers
      for (var i = escherPackages.length - 1; i >= 0; i--){
        command += " \\ \n -i " + escherPackages[i].router;
      }

      // Include bundle
      for (var i = options.bundle.length - 1; i >= 0; i--){
        command += " \\ \n -i " + options.bundle[i];
      }

      // compile command for jam packages
      for (var i = jamConfig.packages.length - 1; i >= 0; i--){
        command += " \\ \n -i " + jamConfig.packages[i].name
      }

      // Add the output file
      command += " \\ \n -o " + options.outputDir + "/" + options.appPath + '.js';

      if (!options.optimize) command += " \\ \n --no-minify";

      if (!options.silent) console.log(command);

      // Do some clean up
      command = command.replace(/\\/g, "");
      command = command.replace(/\n/g, "");
      command = command.replace(/   /g, " ");

      // Execute
      childProcess.exec(command, function(error, stdout){
        if (error) return callback(error);

        if (!options.silent) sys.puts(stdout);

        appendEscherPaths(options.outputDir + "/" + options.appPath + '.js', escherPackages, callback);
      });
    });
  }

  // Get an individual package.js file
, getPackageJs = function(path, callback){
    fs.readFile(path + '/package.js', 'utf-8', function(error, data){
      if (error) return callback(error);

      // Parse code into a predictable format
      data = uglify.gen_code(parser.parse(data, true));

      data = data.substring(data.lastIndexOf('return{') + 'return{'.length - 1);
      data = data.substring(0, data.length - 2);

      data = eval('(' + data + ')');

      // Put the full path in the package
      if (!data.path) data.path = './views/app';
      data.path = data.path.replace('./', path + '/');

      // Do the same for the router
      if (!data.router) data.router = './router';
      data.router = data.router.replace('./', path + '/');

      return callback(null, data);
    });
  }

, appendEscherPaths = function(path, packages, callback){
    var escherPaths = {};

    for (var key in packages){
      escherPaths[packages[key].path] = packages[key].name;
    }

    escherPaths = ';require.config({paths:' + JSON.stringify(escherPaths) + '})';

    fs.appendFile(path, escherPaths, 'utf-8', callback);
  }

  // Get each packages package.js file
, getEscherPackages = function(config, callback){
    var
      packages    = []
    , numComplete = 0
    , bail        = false
    ;

    for (var i = config.apps.length - 1; i >= 0; i--){
      getPackageJs(config.apps[i], function(error, package){
        if (bail) return;
        if (error) return bail = true, callback(error);

        packages.push(package);

        if (++numComplete === config.apps.length) return callback(null, packages);
      });
    }
  }

, compileEscherApp = function(package, callback){
    var
      command   = "jam compile"
    , jamConfig = getJamConfig()
    ;

    // Include root app
    command += " \\ \n -i " + package.path;

    // Exclude bundle
    for (var i = options.bundle.length - 1; i >= 0; i--){
      command += " \\ \n -e " + options.bundle[i];
    }

    // Exclude all jam dependencies
    for (var i = jamConfig.packages.length - 1; i >= 0; i--){
      command += " \\ \n -E " + jamConfig.packages[i].name
    }

    // Exclude requirejs
    command += " \\ \n -e requireLib";

    // Add the output file
    command += " \\ \n -o " +  options.outputDir + "/" + package.name + '.js';

    if (!options.optimize) command += " \\ \n --no-minify";

    if (!options.silent) console.log(command);

    // Do some clean up
    command = command.replace(/\\/g, "");
    command = command.replace(/\n/g, "");
    command = command.replace(/   /g, " ");

    // Execute
    childProcess.exec(command, function(error, stdout){
      if (error) return callback(error);

      if (!options.silent) sys.puts(stdout);

      return callback();
    });
  }

, compileEscherApps = function(config, callback){
    getEscherPackages(config, function(error, packages){
      var
        inParallel = []

      , getCompileFunc = function(package){
          return function(done){
            compileEscherApp(package, done);
          };
        }
      ;

      for (var i = packages.length - 1; i >= 0; i--){
        inParallel.push(getCompileFunc(packages[i]));
      }

      async.parallel(inParallel, callback);
    });
  }

, cleanBuildDirectory = function(callback){
    fs.exists(options.outputDir, function(exists){
      if (!exists) return callback();

      wrench.rmdirRecursive(options.outputDir, function(error){
        if (error) return callback(error);

        fs.mkdir(options.outputDir, callback);
      });
    });
  }
;

module.exports = function(_options, callback){
  options = _options;

  if (!options.bundle) options.bundle = [];

  cleanBuildDirectory(function(error){
    if (error) return callback(error);

    getEscherConfig(function(error, escherConfig){
      if (error) return callback(error);

      compileMain(escherConfig, getJamConfig(), function(error){
        if (error) return callback(error);

        compileEscherApps(escherConfig, function(error){
          if (error) return callback(error);

          return callback();
        });
      });
    });
  });
};