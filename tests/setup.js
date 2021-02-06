/**
 * Global setup and tear down methods.
 */

const dotenv = require('dotenv');
const dotenv_path = __dirname + '/../config/env/.env.' + process.env.NODE_ENV;
console.log('Loading: ' + dotenv_path);
dotenv.config({
    path: dotenv_path,
    silent: false
});

const mongoose_client = require('./../app/models/mongoose_client');

// It is important to check if we really work on testing db.
if (mongoose_client.dbURI.indexOf('arraystestingdb') === -1) {
    console.error('Wrong dbURI: ' + mongoose_client.dbURI);
    process.exit(9);
}

const insertAll = require('./config/insert-all').insertAll;
const removeAll = require('./config/remove-all').removeAll;

module.exports.config = {
    requestURI: 'http://' + process.env.HOST
};

// Export users, teams, datasets;
module.exports.users = require('./config/users');
module.exports.teams = require('./config/teams');
module.exports.datasets = require('./config/datasets');

before(done => {
    process.env.NODE_ENV = 'testing';
    insertAll(err => {
        if (err) {
            console.log(err);
        }
        done();
    });
});

after(done => {
    delete process.env.NODE_ENV;
    removeAll(err => {
        if (err) {
            console.log(err);
        }
        done();
    });
});
