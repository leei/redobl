require('underscore');

var sys = require('sys');
var redis = require('redis-node');

var Redobl = exports.Redobl = function () {
};

// Class methods
Redobl.define = function(name, config, proto) {
  // The name argument is optional.
  if (typeof name !== 'string') {
    proto = config; config = name;
    name = config.name;
  }

  var type_f = Redobl._getClass(config.type);

  var f = function(setup) {
    var args = this._rsetup(setup || {});
    type_f.call(this);
    if (this.init) { this.init.apply(this, _.rest(arguments)); }
  };

  // Inherit instance methods from
  f.prototype = new type_f();
  _.extend(f.prototype, {
    constructor: f,
    className: name
  });
  // and extend with the proto options.
  _.extend(f.prototype, proto);

  // Inherit class methods from type_f (i.e. the specific subclass of Redobl)
  _.extend(f, type_f.classMethods);

  // Now, call the 'constructor' for this new type.
  f._classConstructor(name, config);

  return f;
}

Redobl.prototype = {
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
      if (callback) { callback.call(self, err, status); }
    }
  },

  // Encapsulate a call that must have a new ID set to execute.
  generatingID: function(callback) {
    if (this.id) {
      callback.call(this, null);
    } else {
      //sys.log("Generate ID for " + this.className);
      this.client.incr(this.className, this.redisHandler(function(err, next_id) {
        if (! err) {
          //sys.log("New ID for " + this.className + " = " + next_id);
          this.id = next_id;
        }
        callback.call(this, err);
      }));
    }
  },

  serialize: function(x) {
    return JSON.stringify(x);
  },

  deserialize: function(x) {
    return JSON.parse(x);
  },

  log: function(op, args, extra) {
    if (Redobl.logging) {
      args = Array.prototype.slice.call(args);
      if (typeof args[args.length-1] === 'function') {
        // Remove callback if exists.
        args.pop();
      }
      sys.log("Redobl: " + this.redis_key + "." + op +
              (args.length > 0 ? sys.inspect(args) : "") +
              (extra ? extra : ""));
    }
  }
};

      Redobl.logging = false;
Redobl.classes = {};
Redobl.defaults = {};

_.extend(Redobl, Redobl.classMethods = {
  _classConstructor: function(name, comps) {
    //sys.log(name + "._classConstructor");
    this.className = name;
    this.client = comps.client || this.defaultClient();
    this.callbacks = {};
    this.validations = [];

    //sys.log(name + "._setup = " + this._setup);
    if (this._setup) { this._setup(); }

    //sys.log(name + " = " + sys.inspect(this));
    if (comps.schema) { this.defineSchema(comps.schema); }

    // Should this class serialize its arguments?
    this.serialize = (_.isUndefined(comps.serialize) ? true : comps.serialize);
  },

  create: function(setup, callback) {
    new this(setup).save(callback);
  },

  addClass: function(name, klass) {
    Redobl.classes[name] = klass;
  },

  _getClass: function(type) {
    return Redobl.classes[type] || Redobl.Object;
  },

  defaultClient: function() {
    if (! Redobl.defaults.client) {
      sys.log("WARNING: Redobl.defaults.client undefined. Creating system default.");
      Redobl.defaults.client = redis.createClient();
    }
    return Redobl.defaults.client;
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
  },

  // This is used by subclasses to define the REDIS client functions that they handle.
  define_client_func: function(fname, opts) {
    var klass = this;
    //sys.log("Define List.prototype."+fname+" opts=" + sys.inspect(opts));

    this.prototype[fname] = function() {
      var args = Array.prototype.slice.call(arguments);

      var callback = args.pop();
      // A non-existent callback should be ignored...
      if (!_.isUndefined(callback) && typeof callback !== 'function') {
        args.push(callback);
        callback = undefined;
      }

      // Make sure we have an ID...
      this.generatingID(function(err) {
        if (err) {
          if (callback) callback.call(this, err);
          return;
        }

        if (klass.serialize && opts.serialize) {
          // Either serialize those arguments indicated or all of them...
          var indices = _.isArray(opts.serialize) ? opts.serialize : _.range(args.length);
          for (var i in indices) {
            //sys.log("list: serialize " + sys.inspect(args[i]));
            args[i] = this.serialize(args[i]);
          }
        }
        if (callback) {
          // Process outputs if necessary. Put callback at end of args.
          args.push(this.redisHandler(function(err, retval) {
            // Handle argument deserialization.
            //sys.log("list: return from " + (opts.rfunc || fname) + " err = " + err);
            if (! err && klass.serialize && opts.deserialize) {
              if (_.isArray(retval)) {
                for (var i = 0; i < retval.length; ++i) {
                  //sys.log("list: deserialize " + sys.inspect(retval[i]));
                  retval[i] = this.deserialize(retval[i]);
                }
              } else {
                //sys.log("list: deserialize " + sys.inspect(retval));
                retval = this.deserialize(retval);
              }
            }
            callback.call(this, err, retval);
          }));
        }

        // Now call the function...
        this.log(opts.rfunc || fname, args);
        args.unshift(this.redis_key);
        //sys.log("list: call " + (opts.rfunc || fname) + " with " + sys.inspect(args));
        this.client[opts.rfunc || fname].apply(this.client, args);
      });
    };
  }

});

// Load subclasses.
Redobl.Set = require('./set').Set;
Redobl.Hash = require('./hash').Hash;
Redobl.List = require('./list').List;
Redobl.Object = require('./object').RedObject;
