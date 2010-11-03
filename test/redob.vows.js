var vows = require('vows'), assert = require('assert'), sys = require('sys');
var redis = require('redis-node');

require('underscore');
var Redob = require('../lib/redob').Redob;

var client = Redob.defaults.client = redis.createClient();
client.select(6);
//sys.log("Default redis = " + sys.inspect(client));
client.flushdb();

var Test = Redob.define('Test', {schema: {a: 'int'}}, {
  init: function() { this.initialized = true; }
});

var suite = vows.describe('redob');

suite.addBatch({
  'a redob object': {
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

    'can save itself': {
      topic: function(test) {
        test.save(this.callback);
      },

      'returns successfully': function(err, status) {
        assert.isNull(err);
        assert.isTrue(status);
      },

      'has an integer ID': function(err, status) {
        var test = this.context.topics[1];
        assert.isNumber(test.id);
      },

      'has the a attribute': function(err, status) {
        var test = this.context.topics[1];
        assert.deepEqual(test.attrs, {a: 10});
      },

      'and then find based on id': {
        topic: function(_, test) {
          Test.find(test.id, this.callback);
        },

        'should be the same object': function(err, read) {
          var test = this.context.topics[0];
          assert.isNull(err);
          assert.deepEqual(test.attrs, read.attrs);
        }
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
