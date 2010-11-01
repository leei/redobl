require('underscore');

var Redob = require('./redob').Redob;

var Set = exports.Set = function() {
}

Redob.addClass('set', Set);

Set.define = function(name, config, proto) {
  // The name argument is optional.
  if (typeof name !== 'string') {
    proto = config; config = name; delete proto;
    name = config.name;
  }
  if (! config) { config = {}; }

  config.name = name;
  config.type = 'set';
  return Redob.define(config, proto);
};

Set.prototype = _.extend(new Redob(), {
});
