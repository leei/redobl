require('underscore');

var Redobl = require('./redobl').Redobl;

var Set = exports.Set = function() {
}

Redobl.addClass('set', Set);

Set.define = function(name, config, proto) {
  // The name argument is optional.
  if (typeof name !== 'string') {
    proto = config; config = name;
    name = config.name;
  }
  if (! config) { config = {}; }

  config.name = name;
  config.type = 'set';
  return Redobl.define(config, proto);
};

Set.prototype = _.extend(new Redobl(), {
});
