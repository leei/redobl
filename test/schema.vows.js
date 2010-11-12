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

  'an object with a list association': {
    topic: function() {
      return Redobl.define('Test', {
        schema: {
          ints: 'list',
        }
      });
    },

    'creates the association': function(Test) {
      assert.typeOf(Test.associations.ints, 'object');
    },

    'when instantiated': {
      topic: function(Test) {
        Test.create({}, this.callback);
      },

      'has an association named ints': function(err, test) {
        assert.isNotNull(test.ints);
      },

      'instantiates the ints association': function(err, test) {
        assert.isString(test.ints.redis_key);
      },

      'treats ints as a list': {
        topic: function(test, Test) {
          test.ints.lpush(1, this.callback);
        },

        'returns success': function(err, status) {
          assert.isNull(err);
          assert.equal(status, 1);
        }
      }
    }
  },

  'an object with a set association': {
    topic: function() {
      return Redobl.define('Test', {
        schema: {
          floats: { type: 'set' }
        }
      });
    },

    'creates the set association': function(Test) {
      assert.typeOf(Test.associations.floats, 'object');
    },

    'when instantiated': {
      topic: function(Test) {
        Test.create({}, this.callback);
      },

      'has an association named floats': function(err, test) {
        assert.isNotNull(test.floats);
      },

      'instantiates the floats association': function(err, test) {
        assert.isString(test.floats.redis_key);
      },

      'treats floats as a set': {
        topic: function(test, Test) {
          test.floats.add(1, this.callback);
        },

        'returns success': function(err, status) {
          assert.isNull(err);
          assert.equal(status, 1);
        }
      }
    }
  }
});

suite.export(module);
