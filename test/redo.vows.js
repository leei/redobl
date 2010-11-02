var vows = require('vows'), assert = require('assert'), sys = require('sys');
var redis = require('redis-node');

require('underscore');
var Redob = require('../lib/redob').Redob;

var client = Redob.defaults.client = redis.createClient();
client.select(6);
//sys.log("Default redis = " + sys.inspect(client));
client.flushdb();

var Test = Redob.define('Test', {}, {
  init: function(a, b) {
    this.init_args = [a, b];
  }
});

var suite = vows.describe('redob');

suite.addBatch({
  'a redob object': {
    topic: function() {
      return new Test(1, 1);
    },

    'can determine its own className': function (t) {
      assert.equal(t.className, 'Test');
    },

    'can determine its own constructor function': function (t) {
      assert.instanceOf(t, Test);
    },

    'handles its init arguments': function(t) {
      assert.deepEqual(t.init_args, [1, undefined]);
    },

    'uses the default client unless specified': function(t) {
      assert.equal(t.client, client);
    },

    'has an empty id': function(t) {
      assert.isUndefined(t.id);
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

      'has empty attributes': function(err, status) {
        var test = this.context.topics[1];
        assert.isEmpty(test.attrs);
      }
    }
  }
});

suite.addBatch({
  'close connection': {
    topic: function() {
      client.close();
      return client;
    },

    'should be closed': function(c) {
      ;
    }
  }
});

suite.export(module);
