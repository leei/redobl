var sys = sys = require('sys');

var vows = require('vows');
var assert = require('assert');
var redis = require('redis');

require('underscore');
var Redobl = require('./../lib/redobl').Redobl;

//Redobl.logging = true;

var suite = vows.describe("redobl.SortedSet");

var client = Redobl.defaults.client = redis.createClient();
client.select(6);
client.flushdb();

suite.addBatch({
  'a Redobl.SortedSet type': {
    topic: function() {
      return Redobl.SortedSet.define('Test');
    },

    'should be a function': function(Test) {
      assert.isFunction(Test);
    },

    'a new SortedSet object': {
      topic: function(Test) {
        return new Test();
      },

      'should know that it is a Test': function(Test, test) {
        assert.equal(test.className, "Test");
      },

      'initial state': {
        topic: function(test) {
          test.length(this.callback);
        },

        'is initially empty': function(err, length) {
          assert.equal(length, 0);
        }
      }
    }
  }
});

var Test = Redobl.SortedSet.define('Test');

suite.addBatch({
  'a new SortedSet object': {
    topic: function() {
      return new Test();
    },

    'after an add': {
      topic: function(test) {
        test.add(1, 1, this.callback);
      },

      'succeeds': function(err, status) {
        assert.isNull(err);
        assert.equal(status, 1);
      },

      'has length': {
        topic: function(_, test) {
          test.length(this.callback);
        },

        'one': function(err, length) {
          assert.equal(length, 1);
        }
      },

      'contains': {
        topic: function(_, test) {
          test.range(0, -1, this.callback);
        },

        'one': function(err, elems) {
          assert.deepEqual(elems, [1]);
        }
      }
    }
  }
});

suite.addBatch({
  'a Redobl sorted set': {
    topic: function() {
      return new Test();
    },

    'of length 10': {
      topic: function(test) {
        var that = this;
        test.transaction(function () {
          _.each(_.range(9), function(n) { test.add(-n, n); });
          test.add(-9, 9, that.callback);
        });
      },

      'has length': {
        topic: function(_, test) {
          test.length(this.callback);
        },

        '10': function(err, len) {
          assert.isNull(err);
          assert.equal(len, 10);
        },
      },

      'after remove': {
        topic: function(_, test) {
          test.remove(4, this.callback);
        },

        'successfully removes 1': function(err, count) {
          assert.isNull(err);
          assert.equal(count, 1);
        },

        'contents': {
          topic: function(_, _, test) {
            test.range(0, -1, this.callback);
          },

          'doesn\'t include 4': function(err, set) {
            assert.isNull(err);
            assert.equal(_.indexOf(set, 4), -1);
          }
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

    'should be closed': function() {}
  }
});

suite.export(module);
