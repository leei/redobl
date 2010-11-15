require('underscore');

var Redobl = require('./redobl').Redobl;

var ZSet = exports.ZSet = function() {
}

// Alias...
var SortedSet = exports.SortedSet = ZSet;

Redobl.addClass('zset', ZSet);
Redobl.addClass('sortedset', ZSet);

ZSet.define = function(name, config, proto) {
  // The name argument is optional.
  if (typeof name !== 'string') {
    proto = config; config = name;
    name = config.name;
  }
  if (! config) { config = {}; }

  config.name = name;
  config.type = 'zset';
  return Redobl.define(config, proto);
};

ZSet.prototype = _.extend(new Redobl(), {
});

ZSet.classMethods = _.extend(_.clone(Redobl.classMethods), {
});

// And associate these classMethods with the class.
_.extend(ZSet, ZSet.classMethods);

// Define the mediated functions for this class.
(function(options) {
  for (var name in options) {
    var opts = options[name];
    ZSet.define_client_func(name, options[name]);
  }
})({
  length: {rfunc: 'zcard'},
  add: {rfunc: 'zadd', serialize: [0]},
  remove: {rfunc: 'zrem', serialize: true},
  rank: {rfunc: 'zrank', serialize: true},
  revrank: {rfunc: 'zrevrank', serialize: true},
  range: {rfunc: 'zrange', deserialize: true},
  revrange: {rfunc: 'zrevrange', deserialize: true},
  rangebyscore: {rfunc: 'zrangebyscore', deserialize: true},
  count: {rfunc: 'zcount'},
  score: {rfunc: 'zscore', serialize: true},
  remrangebyrank: {rfunc: 'remrangebyrank'},
  remrangebyscore: {rfunc: 'remrangebyscore'}
});
