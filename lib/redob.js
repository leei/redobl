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

  var type_f = Redob._getClass(config.type);

  var f = function(setup) {
    var args = this._rsetup(setup || {});
    type_f.call(this);
    if (this.init) { this.init.apply(this, _.rest(arguments)); }
  };

  f.prototype = new type_f();
  _.extend(f.prototype, {
    constructor: f,
    className: name
  });
  _.extend(f.prototype, proto);
  // Inherit class methods from type_f (i.e. the specific subclass of Redob)
  for (var m in type_f.classMethods) { f[m] = type_f[m];  }

  // Now, call the 'constructor' for this new type.
  f._rsetupClass(name, config);

  return f;
}

Redob.prototype = {
  _rsetup: function(setup) {
    this.id = setup.id; delete setup.id;
    //sys.log(this.className + "._rsetup(" + this.client + " -> " + this.id + ")");
    this.attrs = _.clone(setup);

    this.constructor.attachProperties(this);
  },

  get client() {
    return this.constructor.client;
  },

  get redis_key() {
    if (! this._redis_key) {
      this._redis_key = this.redisKeyFor("id");
    }
    return this._redis_key;
  },

  redisKeyFor: function(attr) {
    if (! this.id) { sys.log("ERROR: Generating key for ID-less object"); }
    return this.constructor.redisKeyFor(attr, this.id);
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

_.extend(Redob, Redob.classMethods = {
  _rsetupClass: function(name, comps) {
    //sys.log(name + "._rsetupClass");
    this.className = name;
    this.client = comps.client || this.defaultClient();
    this.callbacks = {};
    this.validations = [];

    //sys.log(name + "._setup = " + this._setup);
    if (this._setup) { this._setup(); }

    //sys.log(name + " = " + sys.inspect(this));
    if (comps.schema) { this.defineSchema(comps.schema); }
  },

  create: function(setup, callback) {
    new this(setup).save(callback);
  },

  addClass: function(name, klass) {
    Redob.classes[name] = klass;
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

  defineSchema: function(schema) {
    for (var k in schema) {
      var v = schema[k];
      if (_.isString(v)) {
        // Define a value attribute
        this.defineAttributeOrAssociation(k, {type: v});
      } else {
        this.defineAttributeOrAssociation(k, v);
      }
    }
  },

  defineAttributeOrAssociation: function(name, options) {
    if (_.isString(options.type)) {
      options.type = options.type.toLowerCase();
      switch(options.type) {
      case 'list':
      case 'set':
      case 'hash':
        this.defineAssociation(name, options);
      default:
        this.defineAttribute(name, options);
      }
    } else if (_.isFunction(options.type)) {
      this.defineAssociation(name, options);
    }
  },

  defineProperty: function(name, options) {
    this.properties[name] = options;
  },

  attachProperties: function(object) {
    //sys.log(this.className + ".attachProperties(" + sys.inspect(object) + ")");
    for (var prop in this.properties) {
      //sys.log("Attach property " + prop + " to " + object);
      Object.defineProperty(object, prop, this.properties[prop]);
    }
  },

  redisKeyFor: function(attr, id) {
    return this.className + ":" + attr + ":" + id;
  },

  find: function(id, callback) {
    var self = this;
    this.client.get(this.redisKeyFor("id", id), function(err, val) {
      if (err) {
        callback(err, val);
      } else {
        var attrs = JSON.parse(val);
        attrs.id = id;
        var inst = new self(attrs);
        callback.call(inst, err, inst);
      }
    });
  }
});

// Load subclasses.
Redob.Set = require('./set').Set;
Redob.Hash = require('./hash').Hash;
Redob.List = require('./list').List;
Redob.Object = require('./object').RedObject;
