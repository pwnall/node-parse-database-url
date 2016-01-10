var url = require("url");
var querystring = require("querystring");
var mongodbUri = require("mongodb-uri");

/**
 * This is the exported function that parses database URLs.
 *
 * @param {String} databaseUrl the URL to be parsed
 * @return {Object<String, String>} the database configuration; this will
 *     always have the "driver" key pointing to a database driver, and may
 *     have some of the following keys: "host", "port", "user", "password",
 *     "database", "filename"
 */
module.exports = function (databaseUrl) {
  var parsedUrl = url.parse(databaseUrl, false, true);

  // Query parameters end up directly in the configuration.
  var config = querystring.parse(parsedUrl.query);

  config.driver = (parsedUrl.protocol || "sqlite3:")
    // The protocol coming from url.parse() has a trailing :
    .replace(/\:$/, "")

  // Mongo specific handling because `url` doesn't handle all variants of mongo url
  if (config.driver == 'mongodb') {
    // Use different package here to parse db url
    var mongoConfig = mongodbUri.parse(databaseUrl);

    // Mix and match config object to return the same object
    config = {
      'driver': config.driver,
      'database': mongoConfig.database
    };
    if (mongoConfig.hosts.length > 1) {
      config['host'] = mongoConfig.hosts.map(function(h) {
        var s = h.host;
        if (h.port) s += ":" + h.port;
        return s;
      });
    } else {
      config['host'] = mongoConfig.hosts[0].host;
      config['port'] = mongoConfig.hosts[0].port.toString();
    }

    if (mongoConfig.username) config['user'] = mongoConfig.username;
    if (mongoConfig.password) config['password'] = mongoConfig.password;

    return config;
  }


  // Cloud Foundry will sometimes set a 'mysql2' scheme instead of 'mysql'.
  if (config.driver == "mysql2")
    config.driver = "mysql";

  // url.parse() produces an "auth" that looks like "user:password". No
  // individual fields, unfortunately.
  if (parsedUrl.auth) {
    var userPassword = parsedUrl.auth.split(':', 2);
    config.user = userPassword[0];
    if (userPassword.length > 1) {
      config.password = userPassword[1];
    }
  }

  if (config.driver === "sqlite3") {
    if (parsedUrl.hostname) {
      if (parsedUrl.pathname) {
        // Relative path.
        config.filename = parsedUrl.hostname + parsedUrl.pathname;
      } else {
        // Just a filename.
        config.filename = parsedUrl.hostname;
      }
    } else {
      // Absolute path.
      config.filename = parsedUrl.pathname;
    }
  } else {
    // Some drivers (e.g., redis) don't have database names.
    if (parsedUrl.pathname) {
      config.database =
          parsedUrl.pathname.replace(/^\//, "").replace(/\/$/, "");
    }

    if (parsedUrl.hostname) config.host = parsedUrl.hostname;
    if (parsedUrl.port) config.port = parsedUrl.port;
  }

  return config;
};
