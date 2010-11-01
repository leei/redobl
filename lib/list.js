require('underscore');

var Redob = require('./redob').Redob;

var List = exports.List = function () {
}

Redob.addClass('list', List);

List.define = function(name, config, proto) {
  // The name argument is optional.
  if (typeof name !== 'string') {
    proto = config; config = name; delete proto;
    name = config.name;
  }
  if (! config) { config = {}; }

  config.name = name;
  config.type = 'list';
  return Redob.define(config, proto);
};

List.prototype = _.extend(new Redob(), {
});

