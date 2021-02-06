const _ = require('lodash');
const async = require('async');
const path = require('path');
const winston = require('winston');

const reimport = require('./reimport');
const helpers = require('./index-helpers');
const datasource_description = require('../../../models/descriptions');
const datasource_file_service = require('../../../libs/utils/aws-datasource-files-hosting');

const permissions = require('../permissions-helpers');
const userSrcPath = path.join(__dirname, '../../../../user/');

/**
 * Set save columns function.
 *
 * @param {DatasourceDescription_scheme} description
 */
const setSaveColumnsFunction = (description) => {
    let importCtrl;
    if (description.permissions && description.permissions.indexOf('useStandardSaveColumns') === -1) {
        try {
            require('../../../../user');
            importCtrl = require(path.join(userSrcPath, description._team.subdomain, '/src/import'));
            if (importCtrl.saveColumnsToRowObjects !== undefined) {
                return importCtrl.saveColumnsToRowObjects;
            }
        } catch (e) {
            return helpers.saveColumnsToRowObjects;
        }
    }
    return helpers.saveColumnsToRowObjects;
};
module.exports.setSaveColumnsFunction = setSaveColumnsFunction;

/**
 * Check columns against fe_exclude fields.
 *
 * @param {array} columns
 * @param {Description schema} description
 */
const checkColumnsAgainstFeExcludeFields = (columns, description) => {
    if (columns.length > _.size(description.fe_excludeFields) && _.size(description.fe_excludeFields) > 0) {
        description.fe_excludeFields = reimport.addNewColumnsToFE_ExcludeFields(columns, description.fe_excludeFields);
        description.fe_excludeFieldsObjDetail = reimport.addNewColumnsToFE_ExcludeFields(columns, description.fe_excludeFieldsObjDetail);
    }
    return description;
};
module.exports.checkColumnsAgainstFeExcludeFields = checkColumnsAgainstFeExcludeFields;

/**
 * Find dataset.
 *
 * @param {object} args
 * @param {function} next
 */
const findDataset = (args, next) => {
    datasource_description.findById(args.datasetId)
        .populate('_team')
        .exec((err, description) => {
            if (err) {
                return next(err);
            }

            if (!description) {
                return next(new Error('Could not find datasource description.'));
            }

            //description referring to the master/parent dataset
            description.JSONPath = args.jsonPath;

            args.description = description;
            args.team = description._team;
            next(null, args);
        });
};
module.exports.findDataset = findDataset;

/**
 * Set dataset permissions.
 *
 * @param {object} args
 * @param {function} next
 */
const getDatasetPermissions = (args, next) => {
    permissions.getDatasetPermissions(args.description._team, args.description.vizType, (err, datasetPermissions) => {
        if (err) {
            winston.error(`Problems with permissions of dataset.id: ${args.description._id}`);
            return next(new Error(`Problems with permissions of dataset.id: ${args.description._id}`));
        }
        args.description.permissions = datasetPermissions;
        next(null, args);
    });
};
module.exports.getDatasetPermissions = getDatasetPermissions;

/**
 * Create child datasource description.
 *
 * @param {DatasourceDescription_scheme} parentDescription
 * @param {function} next
 */
const createChild = (parentDescription, next) => {
    const insertQuery = {
        schema_id: parentDescription._id,
        fe_listed: false,
        fe_visible: false,
        $unset: {
            fe_nestedObject: 1,
            imageScraping: 1,
            isPublic: 1,
            customFieldsToProcess: 1,
            _otherSources: 1,
            fe_filters: 1,
            fe_fieldDisplayOrder: 1,
            urls: 1,
            importRevision: 1,
            useCustomview: 1,
            skipImageScraping: 1,
        },
    };

    datasource_description.create(insertQuery, (error, doc) => {
        if (error) {
            return next(new Error(`createChild error: ${error}`));
        }

        if (!doc) {
            return next(new Error('No doc returned when creating child document'));
        }

        doc.schema_id = parentDescription;

        // description now referencing the child
        const description = datasource_description.consolidateDescriptions(doc);

        if (!description) {
            return next(new Error('No description returned when consolidating'));
        }

        next(null, { description });
    });
};
module.exports.createChild = createChild;

module.exports.uploadAncillaryFile = (datasetId, file) => new Promise((resolve, reject) => {
    const tasks = [];

    tasks.push((next) => {
        const queryArgs = {
            id: datasetId,
            populate: ['_team'],
            returnMongoObject: true,
        };

        datasource_description.findByIdAndPopulateFields(queryArgs, (err, dataset) => {
            if (err) {
                return next(err);
            }
            next(null, dataset);
        });
    });

    tasks.push((description, next) => {
        datasource_file_service.uploadAncillaryFile(file.path, file.originalname, file.mimetype, description._team.subdomain, description._id, (err) => {
            if (err) {
                winston.error(`Error during uploading the dataset into AWS : ${file.originalname} (${err.message})`);
                return next(err);
            }
            next(null, description);
        });
    });

    tasks.push((description, next) => {
        description.ancillaryFile = file.originalname;
        description.save((err) => {
            next(err, description);
        });
    });

    async.waterfall(
        tasks,
        (err, description) => {
            if (err) {
                reject({ statusCode: 500, error: err.message });
            } else {
                resolve({ statusCode: 200, data: { fileName: description.ancillaryFile } });
            }
        });
});
