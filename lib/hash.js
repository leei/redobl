require('underscore');

var Redob = require('./redob').Redob;

var Hash = exports.Hash = function () {
}

// Map 'hash' to this Hash class
Redob.addClass('hash', Hash);

Hash.define = function(name, config, proto) {
  // The name argument is optional.
  if (typeof name !== 'string') {
    proto = config; config = name;
    name = config.name;
  }
  if (! config) { config = {}; }

  config.name = name;
  config.type = 'hash';

  return Redob.define(config, proto);
};

Hash.prototype = _.extend(new Redob(), {
});
