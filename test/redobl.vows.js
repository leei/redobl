var vows = require('vows'), assert = require('assert');
var sys = require('sys');
var redis = require('redis-node');

require('underscore');
var Redobl = require('../lib/redobl').Redobl;

//Redobl.logging = true;

var client = Redobl.defaults.client = redis.createClient();
client.select(6);
//sys.log("Default redis = " + sys.inspect(client));
client.flushdb();

var Test = Redobl.define('Test', {schema: {a: 'int'}}, {
  init: function() { this.initialized = true; }
});

var suite = vows.describe('redobl');

suite.addBatch({
  'an unsaved redobl object': {
    topic: function() {
      return new Test({a: 10});
    },

    'can determine its own className': function (t) {
      assert.equal(t.className, 'Test');
    },

    'can determine its own constructor function': function (t) {
      assert.instanceOf(t, Test);
    },

    'uses the default client unless specified': function(t) {
      assert.equal(t.client, client);
    },

    'has an empty id': function(t) {
      assert.isUndefined(t.id);
    },

    'has been initialized': function(t) {
      assert.isTrue(t.initialized);
    },

    'can access its properties via a getter': function(t) {
      assert.equal(t.a, 10);
    },

    'existence test': {
      topic: function(test) {
        test.exists(this.callback);
      },

      'fails': function(err, status, ctx) {
        assert.isNull(err);
        assert.equal(status, 0);
      }
    }
  },

  'a saved redobl object': {
    topic: function() {
      Test.create({a: 10}, this.callback);
    },

    'returns successfully': function(err, test) {
      assert.isNull(err);
    },

    'has an integer ID': function(err, test) {
      assert.isNumber(test.id);
    },

    'has a redis key': function(err, test) {
      assert.isString(test.redis_key);
    },

    'has the a attribute': function(err, test) {
      assert.deepEqual(test.attrs, {a: 10});
    },

    'existence test': {
      topic: function(test) {
        test.exists(this.callback);
      },

      'succeeds': function(err, status) {
        assert.isNull(err);
        assert.equal(status, 1);
      }
    },

    'expiration': {
      topic: function(test) {
        test.expire(20, this.callback);
      },

      'succeeds': function(err, status) {
        assert.isNull(err);
        assert.equal(status, 1);
      },

      'followed by ttl': {
        topic: function(_, test) {
          test.ttl(this.callback);
        },

        'succeeds': function(err, seconds) {
          assert.isTrue(seconds >= 0);
          assert.isTrue(seconds <= 20);
        }
      }
    },

    'is visible to find': {
      topic: function(test) {
        Test.find(test.id, this.callback);
      },

      'should be the same object': function(err, read) {
        var test = this.context.topics[1];
        assert.isNull(err);
        assert.deepEqual(test.attrs, read.attrs);
      }
    },

    'is visible to multiple find': {
      topic: function(test) {
        Test.find([test.id, 0], this.callback);
      },

      'should return test and null': function(err, objs) {
        var test = this.context.topics[1];
        assert.isNull(err);
        assert.isNull(objs[0]);
        assert.equal(objs[test.id].id, test.id);
        assert.deepEqual(objs[test.id].attrs, test.attrs);
      }
    }
  }
});

suite.addBatch({
  'a saved redobl object': {
    topic: function() {
      Test.create({a: 10}, this.callback);
    },

    'can be destroyed': {
      topic: function(test) {
        test.destroy(this.callback);
      },

      'and returns 1': function(err, count) {
        assert.equal(count, 1);
      }
    }
  }
});

suite.addBatch({
  'close connection': {
    topic: function() {
      client.flushdb();
      client.close();
      return client;
    },

    'should be closed': function(c) {
      ;
    }
  }
});

suite.export(module);
