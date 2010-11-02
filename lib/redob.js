require('underscore');

var sys = require('sys');
var redis = require('redis-node');

var Redob = exports.Redob = function () {
};

// Class methods
Redob.define = function(name, config, proto) {
  // The name argument is optional.
  if (typeof name !== 'string') {
    proto = config; config = name;
    name = config.name;
  }

  var f = function(setup) {
    var args = this._rsetup(setup);
    if (this.init) { this.init.apply(this, _.rest(arguments)); }
  };

  var type_f = classMethods._getClass(config.type);

  f.prototype = new type_f();
  _.extend(f.prototype, {
    constructor: f,
    className: name
  });
  _.extend(f, classMethods);
  _.extend(f.prototype, proto);

  f._rsetupClass(name, config);

  return f;
}

Redob.prototype = {
  _rsetup: function(setup) {
    this.id = setup.id;
    this.client = setup.client || this.constructor.client;
    this.attrs = {};
    //sys.log(this.className + "._rsetup(" + this.client + " -> " + this.id + ")");
  },

  get redis_key() {
    if (! this._redis_key) {
      this._redis_key = this.redisKeyFor("id");
    }
    return this._redis_key;
  },

  redisKeyFor: function(attr) {
    if (! this.id) { sys.log("ERROR: Generating key for ID-less object"); }
    return this.className + ":" + attr + ":" + this.id;
  },

  // Provide a standard means for handling errors and binding to this.
  redisHandler: function(callback) {
    var self = this;
    return function(err, status) {
      self.error = err;
      if (callback) { callback.call(self, status); }
    }
  },

  // Encapsulate a call that must have a new ID set to execute.
  generatingID: function(callback) {
    if (this.id) {
      callback.call(this);
    } else {
      //sys.log("Generate ID for " + this.className);
      this.client.incr(this.className, this.redisHandler(function(next_id) {
        if (! this.error) {
          //sys.log("New ID for " + this.className + " = " + next_id);
          this.id = next_id;
        }
        callback.call(this);
      }));
    }
  }
};

Redob.classes = {};
Redob.defaults = {};

var classMethods = {
  create: function(setup, callback) {
    new this(setup).save(callback);
  },

  addClass: function(name, klass) {
    Redob.classes[name] = klass;
  },

  _rsetupClass: function(name, comps) {
    //sys.log(name + "._rsetupClass");
    this.client = comps.client || this.defaultClient();
    //sys.log(name + " = " + sys.inspect(this));
    this.initializeSchema(comps);
  },

  _getClass: function(type) {
    return Redob.classes[type] || Redob.Object;
  },

  defaultClient: function() {
    if (! Redob.defaults.client) {
      sys.log("WARNING: Redob.defaults.client undefined. Creating system default.");
      Redob.defaults.client = redis.createClient();
    }
    return Redob.defaults.client;
  },

  initializeSchema: function(comps) {
  }
};

_.extend(Redob, classMethods);

// Load subclasses.
Redob.Set = require('./set').Set;
Redob.Hash = require('./hash').Hash;
Redob.List = require('./list').List;
Redob.Object = require('./object').RedObject;

