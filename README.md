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
instantiation of an object of that class with "new".

