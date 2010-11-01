require('underscore');

var sys = require('sys');
var redis = require('redis');

var Redob = exports.Redob = function (client, db) {
  //this.client = client || redis.createClient();
  //if (db) { this.client.select(db); }
};

// Class methods
Redob.define = function(name, config, proto) {
  // The name argument is optional.
  if (typeof name !== 'string') { proto = config; config = name; name = config.name; }

  var f = function(key) {
    var args = this._rsetup(key);
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
  _rsetup: function(key) {
    sys.log(this.className + "._rsetup(" + key + ")");
    this._key = key;
    this.redis_key = this.className + ":id:" + key;
  }
};

var classMethods = {
  classes: {},

  addClass: function(name, klass) {
    this.classes[name] = klass;
  },

  _rsetupClass: function(name, comps) {
    sys.log(name + "._rsetupClass");
  },

  _getClass: function(type) {
    return Redob.classes[type] || Redob.Object;
  }
};

_.extend(Redob, classMethods);

// Load subclasses.
Redob.Set = require('./set').Set;
Redob.Hash = require('./hash').Hash;
Redob.List = require('./list').List;
Redob.Object = require('./object').RedObject;

