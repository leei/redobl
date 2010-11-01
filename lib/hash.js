require('underscore');

var Redob = require('./redob').Redob;

var Hash = exports.Hash = function () {
}

Redob.addClass('hash', Hash);

Hash.define = function(name, config, proto) {
  // The name argument is optional.
  if (typeof name !== 'string') {
    proto = config; config = name; delete proto;
    name = config.name;
  }
  if (! config) { config = {}; }

  config.name = name;
  config.type = 'hash';

  return Redob.define(config, proto);
};

Hash.prototype = _.extend(new Redob(), {
});
