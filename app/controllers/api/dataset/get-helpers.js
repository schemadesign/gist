const winston = require('winston');
const _ = require('lodash');
const path = require('path');

const datasource_description = require('../../../models/descriptions');
const nested = require('./nested');
const indexHelpers = require('./index-helpers');
const uploadHelpers = require('./upload-helpers');

const userSrcPath = path.join(__dirname, '../../../../user/');
const { PublicError } = require('../../../libs/system/errors');
const { restoreColorMapping } = require('../../client/colorPalette');

/**
 * Returns dataset by query.
 *
 * @param {Object} query
 */
const getDatasetByQuery = (query) => new Promise((resolve, reject) => {
    // a preview is a description with only a few fields that are necessary for generating viz preview
    // master_id is a preview description property that points to the full, original description
    if (query.master_id) { //getting the preview copy
        datasource_description.findOne(query, (err, dataset) => {
            if (err) {
                winston.error(`getAllDatasetsWithQuery query: ${query} err: ${err}`);
                return reject({ statusCode: 500, message: err });
            }
            resolve({ statusCode: 200, data: { datasets: dataset } });
        });
    } else {
        if (_.isEmpty(query)) {
            winston.error(`getAllDatasetsWithQuery empty query: ${query}`);
            return reject({ statusCode: 500, message: 'query not found' });
        }
        datasource_description.find({
            $and: [
                { $or: [{ replaced: false }, { replaced: { $exists: false } }] },
                { master_id: { $exists: false }, schema_id: { $exists: false } },
                query,
            ],
        }, {
            _id: 1,
            uid: 1,
            title: 1,
            importRevision: 1,
            sample: 1,
            replaced: 1,
            firstImport: 1,
            replacement: 1,
            child_replacement: 1,
            author: 1,
            createdAt: 1,
            fe_views: 1,
            fe_filters: 1,
        })
            .populate({ path: 'author', select: { firstName: 1, lastName: 1, _id: 1 } })
            .exec((err, datasets) => {
                if (err) {
                    winston.error(`getAllDatasetsWithQuery query: ${query} err: ${err}`);
                    return reject({ statusCode: 500, message: err });
                }
                if (_.isEmpty(datasets)) {
                    return reject({ statusCode: 404, message: 'not found' });
                }
                return resolve({ statusCode: 200, data: { datasets: datasets } });
            });
    }
});
module.exports.getDatasetByQuery = getDatasetByQuery;

/**
 * Find dataset by id ({args.datasetId}) and populate it in {args.description}.
 *
 * @param {object} args
 * @param {function} next
 */
const findDataset = (args, next = _.identity) => new Promise((resolve, reject) => {
    args.populate = ['author', 'schema_id', 'schema_id._team', '_team'];

    datasource_description.findByIdAndPopulateFields(args, (err, description) => {
        if (err) {
            reject(err);
            return next(err);
        }

        args.replacement = description.replacement && description.apiEndPoint;

        if (description.schema_id) {
            description = datasource_description.consolidateDescriptions(description);
        }
        args.description = description;
        resolve(args);
        next(null, args);
    });
});
module.exports.findDataset = findDataset;

/**
 * Reads datasource and gets the list of columns.
 *
 * @param {function} readDatasourceFunction the function to process datasource
 * @param {boolean} replacement
 * @param {DatasourceDescription_scheme} description
 * @param {fs.Stream} stream
 */
const readDatasourceAndSetColumns = (readDatasourceFunction, replacement, description, stream) => new Promise((resolve, reject) => {
    readDatasourceFunction(replacement, description, stream, (err, columns) => {
        if (err) {
            winston.error(err);
            return reject({ statusCode: 500, data: { errorWithData: true, error: err, description: description } });
        }

        // replace the source name and update description columns if it's a replacement
        try {
            if (columns.length === 0) {
                for (let i = 0; i < description.columns.length; i++) {
                    description.columns[i].sourceName = description.apiEndPoint;
                }
            } else {
                const saveColumns = uploadHelpers.setSaveColumnsFunction(description);
                description.raw_rowObjects_coercionScheme = saveColumns(columns);
                description.columns = columns;
            }
            resolve({ statusCode: 200, data: { dataset: description } });
        } catch (e) {
            winston.error(`Error reading datasource columns and sample err: ${e}`);
            description.fileName = undefined;

            reject({
                statusCode: 500,
                data: {
                    errorWithData: true,
                    description: description,
                    error: new PublicError('Error reading datasource columns and sample'),
                },
            });
        }
    });
});
module.exports.readDatasourceAndSetColumns = readDatasourceAndSetColumns;

/**
 * Gets the datasource function.
 *
 * @param {DatasourceDescription_scheme} description
 */
module.exports.getReadDatasourceFunction = (description) => {
    let importCtrl;
    const team = description._team;
    if (!description.permissions || !description.permissions.includes('useStandardImport')) {
        try {
            importCtrl = require(path.join(userSrcPath, team.subdomain, '/src/import'));
            winston.debug(`reading file with ${team.subdomain} import function`);
            if (typeof importCtrl.readDatasourceColumnsAndSampleRecords !== 'undefined') {
                return importCtrl.readDatasourceColumnsAndSampleRecords;
            }
        } catch (err) {
            winston.error(`reading file with index helpers: ${err.message}`);
            return indexHelpers.readDatasourceColumnsAndSampleRecords;
        }
    }
    winston.debug('reading file with index helpers');
    return indexHelpers.readDatasourceColumnsAndSampleRecords;
};

module.exports.updateColorMapping = (args, next) => {
    if (args.description.colorMapping) {
        args.description.colorMapping = restoreColorMapping(args.description.colorMapping);
    }

    next(null, args);
};
