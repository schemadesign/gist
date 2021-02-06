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
var dataSourceDescriptions = require('../../../models/descriptions');
var import_controller = require('../data_ingest/controller');
var winston = require('winston');

dataSourceDescriptions.GetDescriptionsToSetup(datasources, function (descriptions) {
    var fn = function(err) {
        if (err) {
            if (err.code == 'ECONNRESET' || err.code == 'ENOTFOUND' || err.code == 'ETIMEDOUT') {
                winston.info('Waiting 3 seconds to restart...');
                setTimeout(function () {
                    import_controller.Import_dataSourceDescriptions__enteringImageScrapingDirectly(dataSourceDescriptions, fn);
                }, 3000);
            } else {
                process.exit(1); // error code
            }
        } else {
            process.exit(0); // all good
        }
    };

    import_controller.Import_dataSourceDescriptions__enteringImageScrapingDirectly(descriptions, fn);
//
});


