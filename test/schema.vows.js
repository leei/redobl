var vows = require('vows'), assert = require('assert'), sys = require('sys');
var redis = require('redis-node');

require('underscore');
var Redobl = require('../lib/redobl').Redobl;

//Redobl.logging = true;

var client = Redobl.defaults.client = redis.createClient();
client.select(6);
//sys.log("Default redis = " + sys.inspect(client));
client.flushdb();

var suite = vows.describe('redobl schemas');

function testAssociation(type_name, other_opts, specifics) {
  return {
    topic: function() {
      return Redobl.define('Test', {
        schema: { ints: _.extend({type: type_name}, other_opts) }
      });
    },

    'creates the association': function(Test) {
      assert.typeOf(Test.associations.ints, 'object');
    },

    'when instantiated': _.extend({
      topic: function(Test) {
        Test.create({}, this.callback);
      },

      'has an association named ints': function(err, test) {
        assert.isNotNull(test.ints);
      },

      'instantiates the ints association': function(err, test) {
        assert.isString(test.ints.redis_key);
      }
    }, specifics)
  }
};

function disable(x) { return {}; }

var Foo = Redobl.define('Foo');

suite.addBatch({
  'an object with an attribute': {
    topic: function() {
      return Redobl.define('Test', {
        schema: {
          foo: { default: 1 },
        }
      });
    },

    'creates the attribute': function(Test) {
      assert.typeOf(Test.attributes.foo, 'object');
    },

    'when instantiated': {
      topic: function(Test) {
        return new Test();
      },

      'assigns the default value': function(_, test) {
        assert.equal(test.foo, 1);
      }
    }
  },

  'an object with a list association': testAssociation('list', {}, {
    'treats ints as a list': {
      topic: function(test, Test) {
        test.ints.lpush(1, this.callback);
      },

      'returns success': function(err, status) {
        assert.isNull(err);
        assert.equal(status, 1);
      }
    }
  }),

  'an object with a list of Foo association': testAssociation('list', {of: Foo}, {
    'given a Foo object': {
      topic: function(test, Test) {
        var that = this;
        Foo.create({}, function (err, status) {
          that.callback(err, this);
        })
      },

      'returns a Foo': function(err, foo) {
        assert.instanceOf(foo, Foo);
      },

      'treats ints as a list': {
        topic: function(foo, test) {
          test.ints.lpush(foo, this.callback);
        },

        'returns success': function(err, status) {
          assert.isNull(err);
          assert.equal(status, 1);
        },

        'and can reload': {
          topic: function(_, foo, test) {
            test.ints.lpop(this.callback);
          },

          'returns the same value': function(err, val) {
            var foo = this.context.topics[2];
            assert.instanceOf(val, Foo);
            assert.equal(val.id, foo.id);
          }
        }
      }
    }
  }),

  'an object with a set association': testAssociation('set', {}, {
    'treats ints as a set': {
      topic: function(test, Test) {
        test.ints.add(1, this.callback);
      },

      'returns success': function(err, status) {
        assert.isNull(err);
        assert.equal(status, 1);
      }
    }
  }),

  'an object with a sorted set association': testAssociation('zset', {}, {
    'treats ints as a sorted set': {
      topic: function(test, Test) {
        test.ints.add(1, 1, this.callback);
      },

      'returns success': function(err, status) {
        assert.isNull(err);
        assert.equal(status, 1);
      }
    }
  })
});

suite.export(module);
