var vows = require('vows'), assert = require('assert'), sys = require('sys');

require('underscore');
var Redob = require('../lib/redob').Redob;

var Test = Redob.define('Test', {}, {
  init: function(a, b) {
    sys.log(this.className + ".init(" + a + ", " + b + ")");
    this.init_args = [a, b];
  }
});

var suite = vows.describe('redob');

suite.addBatch({
  'a redob object': {
    topic: new Test(1, 1),

    'can determine its own className': function (t) {
      assert.equal(t.className, 'Test');
    },

    'handles its init arguments': function(t) {
      assert.deepEqual(t.init_args, [1, undefined]);
    }
  }
});

suite.export(module);
