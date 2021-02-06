var async = require('async');

var Description = require('./../../app/models/descriptions');
var Team = require('./../../app/models/teams');
var User = require('./../../app/models/users');
var Website = require('./../../app/models/websites');
var Page = require('./../../app/models/pages');
var Views = require('./../../app/models/views');


module.exports.removeAll = function(cb) {
    var removeUser = function(callback) {
        console.log('removeUser');
        User.remove({}, function(err) {
            callback(err);
        });
    };

    var removeTeam = function(callback) {
        console.log('removeTeam');
        Team.remove({}, function(err) {
            callback(err);
        });
    };

    var removeDescription = function(callback) {
        console.log('removeDescription');
        Description.remove({}, function(err) {
            callback(err);
        });
    };

    var removeWebsite = function(callback) {
        console.log('removeWebsite');
        Website.remove({}, function(err) {
            callback(err);
        });
    };

    var removePage = function(callback) {
        console.log('removePage');
        Page.remove({}, function(err) {
            callback(err);
        });
    };

    var removeViews = function(callback) {
        console.log('removeViews');
        Views.remove({}, function(err) {
            callback(err);
        });
    };

    async.series([
        removeUser,
        removeTeam,
        removeDescription,
        removeWebsite,
        removePage,
        removeViews
    ], cb);
}
