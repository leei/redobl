require('underscore');

var Redobl = require('./redobl').Redobl;

var sys = require('sys');

var RedObject = exports.RedObject = function () {
  //sys.log("In RedObject constructor...");
}

Redobl.addClass('object', RedObject);

RedObject.prototype = _.extend(new Redobl(), {
  save: function(callback) {
    this.generatingID(function() {
      //sys.log("Save RedObject " + this.redis_key);
      this.client.set(this.redis_key, JSON.stringify(this.attrs),
                      this.redisHandler('set', function(err, status) {
                        callback.call(this, err, this);
                      }));
    });
  },

  load: function(callback) {
    if (! this.id) {
      callback.call(this, "ERROR: Cannot load without id");
    } else {
      this.client.get(this.redis_key, this.redisHandler('get', function(err, val) {
        if (! err) {
          val = JSON.parse(val);
          this.attrs = val;
        }
        if (callback) { callback.call(this, err, this); }
      }));
    }
  },

  attribute: function(attr, val) {
    if (_.isUndefined(val)) {
      return this.attrs[attr];
    }
    return this.attrs[attr] = val;
  }
});

var normalizeType = {
  int: 'number',
  integer: 'number',
  float: 'number',
  text: 'string',
  bool: 'boolean'
};

var typeValidators = {
  number:  function() { return _.isNumber(this); },
  boolean: function() { return _.isBoolean(this); },
  date:    function() { return _.isDate(this); },
  string:  function() { return _.isString(this); }
};

// Inherit Redobl classMethods.
RedObject.classMethods = _.extend(_.clone(Redobl.classMethods), {
  _setup: function() {
    //sys.log(this.className + "._setup()");
    this.attributes = {};
    this.properties = {};
  },

  find_by_ids: function(ids, callback) {
    var self = this;
    var args = _.map(ids, function(id) { return self.redisKeyFor("id", id); });
    args.push(function(err, vals) {
      var insts = {};
      if (! err) {
        for (var i = 0; i < ids.length; ++i) {
          var id = ids[i];
          var attrs = vals[i];
          if (! attrs) {
            insts[id] = null;
          } else {
            attrs = JSON.parse(attrs);
            attrs.id = id;
            insts[id] = new self(attrs);
          }
        }
      }
      callback.call(self, err, insts);
    });

    this.client.mget.apply(this.client, args);
  },

  defineAttribute: function(name, options) {
    var attribute = _.clone(options);
    if (options.type) {
      attribute.type = normalizeType[options.type] || options.type;
      this.addTypeValidator(name, attribute.type);
    }

    // The properties hash will be used to define properties on each instantiated object.
    var property = {
      configurable: false,
      enumerable: true,
      get: function() {
        //sys.log("Get attribute " + name + " => " + this.attrs[name]);
        return this.attrs[name];
      }
    };
    if (! options.readonly) {
      property.set = function(v) {
        //sys.log("Set attribute " + name + " => " + v);
        return this.attrs[name] = v;
      };
    }
    this.defineProperty(name, property);

    this.attributes[name] = attribute;
  },

  addTypeValidator: function(name, type) {
    var validator = typeValidators[type];
    if (validator) {
      this.validations.push(function() {
        if (! validator.call(this)) {
          this.errors.push([name, "should be a " + type]);
          return false;
        }
        return true;
      });
    }
  }
});

// And associate these classMethods with the class.
_.extend(RedObject, RedObject.classMethods);
