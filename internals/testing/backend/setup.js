const MongodbMemoryServer = require('mongodb-memory-server').default;
const dotenv = require('dotenv');
const fs = require('fs-extra');
const async = require('async');

module.exports = () => {
    dotenv.config({ path: `${__dirname}/.env`, silent: false });

    const mongod = new MongodbMemoryServer();
    const mongoConntectionTask = mongod.getConnectionString();
    const dbName = mongod.getDbName();
    const dbPort = mongod.getPort();

    const filesToCopy = [
        ['pokemonGO.csv', 'glitter/datasets/5a42c26e303770207ce8f83b'],
        ['pokemonGO.csv', 'glitter/datasets/5a42c26e303770207ce8f83c'],
        ['allDataTypes.json', 'glitter/datasets/5b05779b35ad5f003c7ccf9c'],
        ['pokemonGO.csv', 'user/datasets/5a42fe1629232d26d4713775'],
        ['childPokemon.csv', 'user/datasets/5b0581b4f667d3003654c144'],
        ['pokemonV1.csv', 'versions/datasets/5b313181ab3ff414bf623791'],
        ['pokemonV2.csv', 'versions/datasets/5b3133c85fc24614bd922d6c'],
        ['pokemonV3.csv', 'versions/datasets/5b31379a52e34d16f914e8bf'],
    ];
    const copyFixturesToFakeS3Task = async.each(
        filesToCopy,
        (val) =>
            fs.copy(
                `${__dirname}/fixtures/rawDatasets/${val[0]}`,
                `${__dirname}/../../../__mocks__/tmp/buckets/${process.env.DO_S3_BUCKET}/${val[1]}/datasources/${val[0]}`,
            ),
    );

    const tasks = Promise.all([mongoConntectionTask, dbName, dbPort, copyFixturesToFakeS3Task]);

    return tasks.then(([mongoUri, dbName, dbPort]) => {
        process.env.MONGODB_URI = mongoUri;
        process.env.MONGODB_NAME = dbName;
        process.env.MONGODB_PORT = dbPort;
    });
};
