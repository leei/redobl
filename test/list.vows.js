var vows = require('vows'), assert = require('assert'), sys = require('sys');
var redis = require('redis-node');

require('underscore');
var Redob = require('../lib/redob').Redob;

var suite = vows.describe("redob.List");

var client = Redob.defaults.client = redis.createClient();
client.select(6);
client.flushdb();

suite.addBatch({
  'a Redob.List type': {
    topic: function() {
      return Redob.List.define('Test');
    },

    'should be a function': function(Test) {
      assert.isFunction(Test);
    },

    'a new list object': {
      topic: function(Test) {
        return new Test();
      },

      'should know that it is a Test': function(Test, test) {
        assert.equal(test.className, "Test");
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

    'should be closed': function() {}
  }
});

suite.export(module);
