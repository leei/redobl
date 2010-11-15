require('underscore');

var sys = require('sys');
var redis = require('redis-node');
var EventEmitter = require('events').EventEmitter;

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
    type_f.call(this, setup);
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
    this._id = setup.id; delete setup.id;

    this.emitter = new EventEmitter();

    // Attach properties to each instance.
    this.constructor.instantiators(this);
    this.constructor.attachProperties(this);

    // If we've instantiated with ID then run after_id.
    if (this.id) { this.emitter.emit('after_id'); }
  },

  get id() {
    return this._id;
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
  redisHandler: function(func, callback) {
    var self = this;
    return function(err, status) {
      self.error = err;
      self.log(func, [], err ? (" ERROR: " + err) : (" => " + status));

      if (callback) { callback.call(self, err, status); }
    }
  },

  // Encapsulate a call that must have a new ID set to execute.
  generatingID: function(callback) {
    if (this.id) {
      callback.call(this, null);
    } else {
      //sys.log("Generate ID for " + this.className);
      this.client.incr(this.className,
                       this.redisHandler(this.className + '.incr', function(err, next_id) {
        if (! err) {
          //sys.log("New ID for " + this.className + " = " + next_id);
          this._id = next_id;
          this.emitter.emit('after_id');
        }
        callback.call(this, err);
      }));
    }
  },

  load: function(callback) {
    callback.call(this, null, this);
  },

  save: function(callback) {
    this.generatingID(function(err) {
      this.error = err;
      callback.call(this, err, this);
    });
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
      sys.log("Redobl: " +
              (this.id ? this.redis_key + "." : "") + op +
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

    this._instantiators = [];
    this.validations = [];
    this.associations = {};
    this.properties = {};

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
      //sys.log(this.className + " schema " + k);
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
        break;
      default:
        this.defineAttribute(name, options);
      }
    } else if (_.isFunction(options.type)) {
      this.defineAssociation(name, options);
    } else {
      this.defineAttribute(name, options);
    }
  },

  defineAssociation: function(aname, options) {
    this.associations[aname] = _.clone(options);
    var assoc_type = Redobl.define(this.className + "::" + aname, options);
    this.addInstantiator(function () {
      // We can't instantiate these association objects until after the object's
      // id is defined.
      var that = this;
      // TODO: Change to once when we upgrade to node 0.3.0
      this.emitter.on('after_id', function () {
        var assoc = new assoc_type({id: that.id});
        Object.defineProperty(that, aname, {
          value: assoc,
          writable: false,
          enumerable: true
        });
        return true;
      });
    });
  },

  defineProperty: function(name, options) {
    this.properties[name] = options;
  },

  addInstantiator: function(f) {
    this._instantiators.push(f);
  },

  instantiators: function(instance) {
    this._instantiators.forEach(function (f) {
      f.call(instance);
    });
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
    if (_.isNumber(id)) {
      this.find_by_id(id, callback);
    } else if (_.isArray(id)) {
      this.find_by_ids(id, callback);
    }
  },

  find_by_id: function(id, callback) {
    var inst = new this({id: id});
    inst.load(callback);
  },

  find_by_ids: function(ids, callback) {
    var self = this;
    var insts = {};
    _.each(ids, function(id) { insts[id] = new self({id: id}); });
    callback.call(this, null, insts);
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
          args.push(this.redisHandler(opts.rfunc || fname, function(err, retval) {
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

// Define the mediated functions for this class.
(function(options) {
  for (var name in options) {
    var opts = options[name];
    Redobl.define_client_func(name, options[name]);
  }
})({
  exists: {},
  expire: {},
  expireat: {},
  ttl: {}
});

// Load subclasses.
Redobl.Set = require('./set').Set;
Redobl.ZSet = require('./zset').ZSet;
Redobl.SortedSet = require('./zset').SortedSet;
Redobl.Hash = require('./hash').Hash;
Redobl.List = require('./list').List;
Redobl.Object = require('./object').RedObject;
