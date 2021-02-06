//
//
// NOTE: Run this from arrays-server-js via bin/_*_MVP_DB_seed
//
var dotenv_path = __dirname + '/../../../../config/env/.env.' + (process.env.NODE_ENV ? process.env.NODE_ENV : 'development');
require('dotenv').config({
    path: dotenv_path
});
//
var datasources = require('./cmd_parser').GetDatasources();
var datasourceDescriptions = require('../../../models/descriptions');
//
//
var postimport_caching_controller = require('../cache/controller');

datasourceDescriptions.GetDescriptionsToSetup(datasources, function (descriptions) {

    var fn = function(err) {
        if (err) {
            process.exit(1); // error code
        } else {
            process.exit(0); // All Good
        }
    };

    postimport_caching_controller.GeneratePostImportCaches(descriptions, fn);
});

