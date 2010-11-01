require('underscore');

var Redob = require('./redob').Redob;

var RedObject = exports.RedObject = function () {
}

Redob.addClass('object', RedObject);

RedObject.prototype = _.extend(new Redob(), {
});
