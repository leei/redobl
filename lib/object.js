require('underscore');

var Redob = require('./redob').Redob;

var sys = require('sys');

var RedObject = exports.RedObject = function () {
}

Redob.addClass('object', RedObject);

RedObject.prototype = _.extend(new Redob(), {
  save: function(callback) {
    this.generatingID(function() {
      //sys.log("Save RedObject " + this.redis_key);
      this.client.set(this.redis_key, JSON.stringify(this.attrs),
                      this.redisHandler(callback));
    });
  },

  reload: function(callback) {
    this.client.get(this.redis_key, this.redisHandler(function(val) {
      if (! this.error) {
        val = JSON.parse(val);
        this.attrs = val;
        if (callback) { callback.call(this); }
      }
    }));
  }
});
