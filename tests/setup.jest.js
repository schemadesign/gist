/**
 * Global setup and tear down methods.
 */

const mongoose_client = require('./../app/models/mongoose_client');

const insertAll = require('./config/insert-all').insertAll;
const removeAll = require('./config/remove-all').removeAll;

module.exports.config = {
    requestURI: 'http://' + process.env.HOST
};

// Export users, teams, datasets;
module.exports.users = require('./config/users');
module.exports.teams = require('./config/teams');
module.exports.datasets = require('./config/datasets');

beforeAll(done => {
    process.env.NODE_ENV = 'testing';
    insertAll(err => {
        if (err) {
            console.log(err);
        }
        done();
    });
});

afterAll(done => {
    delete process.env.NODE_ENV;
    removeAll(err => {
        if (err) {
            console.log(err);
        }
        done();
    });
});
