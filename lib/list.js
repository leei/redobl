require('underscore');

var Redobl = require('./redobl').Redobl;
var sys = require('sys');

var List = exports.List = function () {
  //sys.log("In List constructor...");
}

Redobl.addClass('list', List);

List.define = function(name, config, proto) {
  // The name argument is optional.
  if (typeof name !== 'string') {
    proto = config; config = name;
    name = config.name;
  }
  if (! config) { config = {}; }

  config.name = name;
  config.type = 'list';

  return Redobl.define(config, proto);
};

List.prototype = _.extend(new Redobl(), {
});

List.classMethods = _.extend(_.clone(Redobl.classMethods), {
  _setup: function(comps) {
    // Initialize serialization of a class...
    if (comps.of) {
      this.serializer = Redobl.get_serializer({of: comps.of});
    }
  }
});

// And associate these classMethods with the class.
_.extend(List, List.classMethods);

// Define the mediated functions for this class.
(function(options) {
  for (var name in options) {
    var opts = options[name];
    List.define_client_func(name, options[name]);
  }
})({
  length: {rfunc: 'llen'},
  lpush: {serialize: true},
  rpush: {serialize: true},
  lpop: {deserialize: true},
  rpop: {deserialize: true},
  range: {rfunc: 'lrange', deserialize: true},
  trim: {rfunc: 'ltrim'},
  index: {rfunc: 'lindex', deserialize: true},
  set: {rfunc: 'lset', serialize: [1]},
  remove: {rfunc: 'lrem', serialize: [1]}
});
