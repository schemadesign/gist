// 'use strict'; //?

/**
 * URL Query...
 * @module  urlquery
 */

const winston = require('winston');
const querystring = require('querystring');

module.exports = function (str, callback) {

    class MyError extends Error {}

    query = querystring.parse(str);

    // var source_key = req.params.source_key;
    // if (source_key == null || typeof source_key == 'undefined' || source_key == "") {
    // return next(err);
    // }
    //
    // return callback(new MyError('there was a problem'));
    winston.error(str);
    winston.error(query);

    return callback(null, query);
};
