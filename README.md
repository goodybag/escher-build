# Escher Build Tool

This is the build tool for [Escher](https://github.com/goodybag/escher). It's a wrapper around jam's build tool which in turn is a wrapper around requirejs's build tool. But since you developed a jam app, you don't need to do any configuration for your build process! Escher figures out the optimal solution.

```
npm install -g escher
```

## Usage

When your escher app has been completed, you'll want to optimize your project for production. Since you've developed your app using Escher, there is no need to make a build configuration file for r.js. Just run ```escher compile app``` in your top-level directory, and it will throw everything in a build folder.


Your app.js file should similar to this:

```javascript
define(function(require){
  var
    escher = require('escher')
  , app = {
      init: function(){
        escher.config({
          apps:[
            'apps/merlin'
          , 'apps/auth'
          , 'apps/home'
          , 'apps/businesses'
          , 'apps/tablets'
          , 'apps/users'
          ]
        });

        escher.start('merlin', function(err, app) {
          if (err) return escher.logger.error(err);
        });
      }
    }
  ;

  return app;
});
```

After compiling, check your build directory for the new files.

## Options

The options for escher are pretty few:

```
escher [path [options]]

-s --silent             No output
--no-minify             No minification, still concatenates
--output-dir {dir}      Your build directory
```