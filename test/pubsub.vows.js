var vows = require('vows'), assert = require('assert'), sys = require('sys');
var redis = require('redis');

require('underscore');
var Redobl = require('../lib/redobl').Redobl;

//Redobl.logging = true;

var client = Redobl.defaults.client = redis.createClient();
client.select(6);
//sys.log("Default redis = " + sys.inspect(client));
client.flushdb();

var suite = vows.describe('redobl pub/sub');

suite.addBatch({
  'a Redobl object': {
    topic: function () {
      var Test = Redobl.define("Test");
      return new Test();
    },

    'can publish w/o subscribers': {
      topic: function(test) {
        test.publish({a: 2}, this.callback);
      },

      'should return zero': function(err, num) {
        assert.equal(num, 0);
      }
    }
  }
});

suite.addBatch({
  'a Redobl object': {
    topic: function () {
      var Test = Redobl.define("Test");
      return new Test();
    },

    'can be subscribed to': {
      topic: function(test) {
        test.subscribe(this.callback);
        setTimeout(function() {
          test.publish({a: 1, b:2});
        }, 500);
      }
    }
  }
});

suite.export(module);
