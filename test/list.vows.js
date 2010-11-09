var sys = sys = require('sys');

var vows = require('vows');
var assert = require('assert');
var redis = require('redis-node');

require('underscore');
var Redobl = require('./../lib/redobl').Redobl;

//Redobl.logging = true;

var suite = vows.describe("redobl.List");

var client = Redobl.defaults.client = redis.createClient();
client.select(6);
client.flushdb();

suite.addBatch({
  'a Redobl.List type': {
    topic: function() {
      return Redobl.List.define('Test');
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
      },

      'initial state': {
        topic: function(test) {
          test.length(this.callback);
        },

        'is initially empty': function(err, length) {
          assert.equal(length, 0);
        }
      },

      'after an lpush': {
        topic: function(test) {
          test.lpush(1, this.callback);
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
        },

        'then an rpush': {
          topic: function(_, test) {
            test.rpush(2, this.callback);
          },


          'has length': {
            topic: function(_, _, test) {
              test.length(this.callback);
            },

            'two': function(err, length) {
              assert.equal(length, 2);
            }
          },

          'contains': {
            topic: function(_, _, test) {
              test.range(0, -1, this.callback);
            },

            'two': function(err, elems) {
              assert.deepEqual(elems, [1, 2]);
            }
          }
        }
      }
    }
  }
});

suite.addBatch({
  'a Redobl list of length 10': {
    topic: function() {
      var test = new(Redobl.List.define('Test'));
      _.each(_.range(10), function(n) { test.rpush(n); });
      return test;
    },

    'has length': {
      topic: function(test) {
        test.length(this.callback);
      },

      '10': function(err, len) {
        assert.isNull(err);
        assert.equal(len, 10);
      },
    },

    'has right side': {
      topic: function(test) {
        test.index(-1, this.callback);
      },

      '9': function(err, value) {
        assert.equal(value, 9);
      }
    },

    'has left side': {
      topic: function(test) {
        test.index(0, this.callback);
      },

      '0': function(err, value) {
        assert.equal(value, 0);
      }
    },

    'has head': {
      topic: function(test) {
        test.range(0, 3, this.callback);
      },

      '[0..3]': function(err, value) {
        assert.deepEqual(value, [0, 1, 2, 3]);
      },

      'after lpop': {
        topic: function(value, test) {
          test.lpop(this.callback);
        },

        'returns 0': function(err, val) {
          assert.equal(val, 0);
        }
      }
    },

    'has tail': {
      topic: function(test) {
        test.range(-4, -1, this.callback);
      },

      '[6, 7, 8, 9]': function(err, value) {
        assert.deepEqual(value, [6, 7, 8, 9]);
      },

      'after rpop': {
        topic: function(value, test) {
          test.rpop(this.callback);
        },

        'returns 9': function(err, val) {
          assert.equal(val, 9);
        }
      }
    },

    'after rem': {
      topic: function(test) {
        test.rem(0, 4, this.callback);
      },

      'successfully removes 1': function(err, count) {
        assert.isNull(err);
        assert.equal(count, 1);
      },

      'contents': {
        topic: function(_, test) {
          test.range(0, -1, this.callback);
        },

        'doesn\'t include 4': function(err, list) {
          assert.isNull(err);
          assert.equal(_.indexOf(list, 4), -1);
        },

        'trimmed': {
          topic: function(list, _, test) {
            test.trim(0, -3, this.callback);
          },

          'returns successfully': function(err, status) {
            assert.isNull(err);
            assert.equal(status, 1);
          },

          'contents': {
            topic: function(_, list, _, test) {
              test.range(0, -1, this.callback);
            },

            'are 2 less': function(err, new_list) {
              var old_list = this.context.topics[2];
              assert.equal(new_list.length, old_list.length - 2);
              assert.deepEqual(new_list, old_list.slice(0, -2));
            }
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
