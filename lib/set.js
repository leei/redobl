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

Set.classMethods = _.extend(_.clone(Redobl.classMethods), {
  _setup: function(comps) {
    // Initialize serialization of a class...
    if (comps.of) {
      this.serializer = Redobl.of_serializer(comps.of);
    }
  }
});

// And associate these classMethods with the class.
_.extend(Set, Set.classMethods);

// Define the mediated functions for this class.
(function(options) {
  for (var name in options) {
    var opts = options[name];
    Set.define_client_func(name, options[name]);
  }
})({
  length: {rfunc: 'scard'},
  add: {rfunc: 'sadd', serialize: true},
  remove: {rfunc: 'srem', serialize: true},
  pop: {rfunc: 'spop', deserialize: true},
  randmember: {rfunc: 'srandmember', deserialize: true},
  ismember: {rfunc: 'sismember', serialize: true},
  members: {rfunc: 'smembers', deserialize: true}
});
