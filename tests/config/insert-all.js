var async = require('async');

var Description = require('./../../app/models/descriptions');
var Team = require('./../../app/models/teams');
var User = require('./../../app/models/users');
var Views = require('./../../app/models/views');
var Sites = require('./../../app/models/websites');
var Pages = require('./../../app/models/pages');
var datasets = require('./datasets');
var teams = require('./teams');
var users = require('./users');
var views = require('./views');
var sites = require('./sites');
var pages = require('./pages');


module.exports.insertAll = function(cb) {
    var createUser = function(callback) {
        var usersToInsert = [
            users.user1,
            users.user2,
            users.editorUser,
            users.siteEditorUser,
            users.articleEditorUser,
            users.articleViewerUser,
            users.special_user,
            users.user3,
            users.versionUser
        ];

        console.log('createUsers');
        User.insertMany(usersToInsert, function(err, user) {
            callback(err);
        });
    };

    var createTeam = function(callback) {
        var teamsToInsert = [
            teams.team1,
            teams.team2,
            teams.teamApptension,
            teams.versionTeam
        ];

        console.log('createTeams');
        Team.insertMany(teamsToInsert, function(err, team) {
            callback(err);
        });
    };

    var createDescription = function(callback) {
        var datasetsToInsert = [
            datasets.pokemon1,
            datasets.simpsons,
            datasets.teamViz,
            datasets.totallyPrivateViz,
            datasets.privateVizWithEditor,
            datasets.freshViz,
            datasets.childDoc,
            datasets.pokemonV1,
            datasets.pokemonV2,
            datasets.pokemonV3,
            datasets.pokemon1Draft,
            datasets.apiDataset
        ];

        console.log('createDescriptions');
        Description.insertMany(datasetsToInsert, function(err, dataset) {
            callback(err);
        });
    };

    var createViews = function(callback) {
        console.log('createViews');
        Views.insertMany(views.views, function(err, dataset) {
            callback(err);
        })
    };

    var createSites = function(callback) {
        var sitesToInsert = [
            sites.newSite,
            sites.site1,
            sites.article1HostSite
        ];

        console.log('createSites');
        Sites.insertMany(sitesToInsert, function(err, site) {
            callback(err);
        });
    };

    var createPages = function(callback) {
        var pagesToInsert = [
            pages.homepage,
            pages.page1,
            pages.page2,
            pages.page3_unpublished,
            pages.article1
        ];

        console.log('createPages');
        Pages.insertMany(pagesToInsert, function(err, page) {
            callback(err);
        });
    }

    async.waterfall([
        createViews,
        createUser,
        createTeam,
        createDescription,
        createSites,
        createPages
    ], function(err) {
        cb(err);
    });
}
