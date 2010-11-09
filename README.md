Redobl (REDIS Object Language)
==============================

The REDIS Object Language (Redobl -- "redouble") is a slightly higher level
abstraction for interacting with [REDIS](http://code.google.com/p/redis/) from
[node.js](http://nodejs.org). It is an attempt to provide a data modeling
language for the basic REDIS object types.

The simple idea is to provide a set of Javascript "classes" for interacting
with REDIS-stored objects and to automatically handle much of the client
interaction, including allocation of object keys, relationships between
objects and such more advanced features as object indexing, schema management
etc.

Installation:
-------------

    npm install redobl

Basic Usage:
------

    var Redobl = require("redobl");

    var Test = Redobl.List.define("Test");
    var test = new Test();
    test.lpush(4);
    test.rpush(5);
    test.lpush(3);
    test.range(0, -1, function(err, contents) {
      sys.log("list contents = " + sys.inspect(contents));
    });

This will print "list contents = [3, 4, 5]".  Note that the process starts
with the definition of a Redobl *class* called "Test" and then the
instantiation of an object of that class with "new". After this, any of the
operations on this object will engage with the persistent REDIS store.

Initialization:
---------------

    var Redobl = require("redobl");
    var redis = require("redis-node");

    var client = Redobl.defaults.client = redis.createClient();


Classes:
--------

### Redobl

This is the *superclass* of all of the Redobl classes.  It defines a number of
class and instance functions that apply universally to all Redobl classes and
instances.

* Redobl.define(name, config, protos)

#### Class Methods

### Object

    var Test1 = Redobl.RedObject.define("Test");
    var Test2 = Redobl.define("Test");
    var Test3 = Redobl.define("Test", {type: "object"});

All of the above are equivalent.

* save (function(err, status) {})

* reload (function(err) {})

* attribute (attr, val)

### List

    var List1 = Redobl.List.define("List");
    var List2 = Redobl.define("List", {type: "list"});

* length (function(err, len) {})

* lpush (value, function(err, status) {})

* rpush (value, function(err, status) {})

* lpop (value, function(err, value) {})

* rpop (value, function(err, value) {})

* range (start, end, function(err, contents) {})

* trim (start, end, function(err, value) {})

* index (idx, function(err, value) {})

* set (idx, value, function(err, status) {})

* rem (count, value, function(err, count) {})

### Set

* length (function(err, len) {})

* add (value, function(err, new_member) {})

* remove (value, function(err, was_member) {})

* pop (function(err, rand_member) {})

* randmember (function(err, rand_member) {})

* ismember (function(err, result) {})

* members (function(err, values) {})

### SortedSet

### Hash

Schema:
-------

*TBD*

Indexing:
--------

*TBD*

_Much more to come_