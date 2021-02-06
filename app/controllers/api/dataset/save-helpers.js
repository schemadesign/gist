const { clone, filter, forEach, get, has, isEmpty, isEqual, kebabCase, min, nth, omit, omitBy, unset } = require('lodash');
const async = require('async');
const request = require('request');
const winston = require('winston');

const markdown = require('../../../libs/utils/markdown');
const datasource_description = require('../../../models/descriptions');
const Team = require('../../../models/teams');
const User = require('../../../models/users');
const PermissionsHelpers = require('../permissions-helpers');
const mandatorySettings = require('./mandatory-settings-helpers');
const Queue = require('../../../boot/queue-init');
const uploadHelpers = require('./upload-helpers');
const getHelpers = require('./get-helpers');
const { getAllViewsSettings } = require('../../../utils/views');
const datasource_file_service = require('../../../libs/utils/aws-datasource-files-hosting');
const { getSheet } = require('../../../libs/datasources/smartsheet');
const { getDeals } = require('../../../libs/datasources/pipedrive');
const datadotworld = require('../../../libs/datasources/data-dot-world');
const salesforce = require('../../../libs/datasources/salesforce');
const { formatFieldValue } = require('../../../../shared/fields');
const { hasValidDatasetSource } = require('../../../utils/datasets');
const { PublicError } = require('../../../libs/system/errors');
const { setSafeColorMapping } = require('../../client/colorPalette');

/**
 * Creates new dataset.
 *
 * @param {object} args
 */
const createNewDataset = ({ body: args, user }) => new Promise((resolve, reject) => {
    async.waterfall([
        (callback) => {
            Team.findById(args._team, (err, team) => {
                if (err) {
                    return callback(err);
                }

                if (!team) {
                    return callback(new Error('Couldn\'t find team when creating new dataset'));
                }

                callback(null, team);
            });
        },
        (team, callback) => {
            const default_view = args.vizType === 'standardViz' ? 'gallery' : team.subdomain;
            const dataset = {
                ...args,
                fe_views: {
                    default_view,
                    views: { [default_view]: { visible: true } },
                },
            };

            datasource_description.create(dataset, (err, doc) => {
                if (err) {
                    return callback(err);
                }

                if (!doc) {
                    return callback(new Error('Error making new dataset doc'));
                }

                callback(null, doc, team);
            });
        },
        async (dataset, team, callback) => {
            try {
                const userData = await User
                    .findOneAndUpdate({ _id: user }, { $push: { _editors: dataset._id } }, { new: true })
                    .populate('defaultLoginTeam');

                callback(null, dataset, team, userData);
            } catch (e) {
                callback(e, dataset, team);
            }
        },
        (mainDataset, team, user, callback) => {
            const mainDatasetId = mainDataset._id;
            if (args.schema_id) {
                return callback(null, mainDatasetId, user);
            }

            team.datasourceDescriptions.push(mainDatasetId);
            team.save((err) => callback(err, mainDatasetId, user));
        },
    ], (err, id, user) => {
        if (err) {
            reject({ statusCode: 500, error: err.message });
        } else {
            resolve({ statusCode: 200, data: { id, user } });
        }
    });
});
module.exports.createNewDataset = createNewDataset;

const updateColumns = (rowObjects, columns, previousColumns = []) => {
    forEach(columns, (column) => {
        const { name } = column;

        if (has(rowObjects, name)) {
            const { operation, format, outputFormat, currency } = rowObjects[name];

            column.operation = operation;

            const previousColumn = previousColumns.find((column) => column.name === name);
            column.sample = formatFieldValue(column.sample, previousColumn || rowObjects[name], true);

            unset(column, 'input_format');
            unset(column, 'output_format');
            unset(column, 'currency');

            // to integer, to percent or to float are all data_type Number so that'll be default
            switch (operation) {
                case 'ToString':
                case 'ToStringTrim':
                    column.data_type = 'Text';
                    break;
                case 'ToMarkdown':
                    column.data_type = 'Markdown';
                    break;
                case 'ToDate':
                    column.data_type = 'Date';
                    column.input_format = format;
                    column.output_format = outputFormat;
                    break;
                case 'ToCurrency':
                    column.data_type = 'Currency';
                    column.currency = currency;
                    break;
                default:
                    column.data_type = 'Number';
            }
        }
    });

    return columns;
};
module.exports.updateColumns = updateColumns;

const startJobIfNeeded = async (datasetId, dirty) => {
    if (dirty > 0) {
        const jobName = nth(
            ['preImport', 'importProcessed', 'postImport', 'scrapeImages'],
            dirty - 1,
        );
        const { id } = await Queue.scheduleJob(jobName, { id: datasetId });

        return id;
    }

    return null;
};

module.exports.startJobIfNeeded = startJobIfNeeded;

const isFieldUsed = async (excludeFields = {}, description, user) => {
    let views;
    let columnView;

    try {
        views = await getAllViewsSettings(user);
    } catch (e) {
        winston.error(e);
        throw new Error('An error occurred while validating usage of field.');
    }

    forEach(views, view => {
        view.settings = filter(view.settings, { selectFrom: 'column' });
    });

    forEach(description.fe_views.views, (view, key) => {
        if (!view.visible) {
            return;
        }

        columnView = views.find(({ name }) => isEqual(name, key));

        forEach(columnView.settings, setting => {
            const fieldName = view[setting.name];
            if (excludeFields[fieldName]) {
                throw new Error(`Can't exclude field "${fieldName}",
                    it is being used in ${columnView.displayAs} view`);
            }
        });
    });
};

module.exports.isFieldUsed = isFieldUsed;

/**
 * Update existing dataset.
 *
 * @param {object} body
 * @param {object} user
 */
const updateExistingDataset = async (body, user) => {
    const dirty = [];
    let description = await datasource_description
        .findById(body._id)
        .lean()
        .deepPopulate('schema_id schema_id._team _team author');

    if (!description) {
        throw new Error('No dataset found for update');
    }

    if (description.jobId) {
        throw new Error('Dataset is processing');
    }

    if (body.fe_excludeFields && description.fe_views) {
        await isFieldUsed(body.fe_excludeFields, description, user);
    }

    let permissions;
    const team = description.schema_id ? description.schema_id._team : description._team;

    try {
        permissions = await PermissionsHelpers.getDatasetPermissions(team, description.vizType);
    } catch (e) {
        throw new Error(`Problems with permissions of dataset.id ${description._id}`);
    }

    if (description.schema_id) {
        description = datasource_description.consolidateDescriptions(description);
    }

    if (body.columns === null || (description.apiEndPoint && body.replacement)) {
        description.columns = [];
    }

    if (isEmpty(description.columns) && hasValidDatasetSource(description)) {
        const readDatasourceFunction = getHelpers.getReadDatasourceFunction({ permissions, ...description });
        const stream = await getFileStream(description);

        try {
            const { data: { dataset: { columns } } } = await getHelpers.readDatasourceAndSetColumns(
                readDatasourceFunction,
                body.replacement,
                description,
                stream,
            );
            processColumns(columns, body);
        } catch ({ data }) {
            throw data.errorWithData ? data.error : data;
        }
    }

    let updateStatement = {
        $set: omit(body, ['author', '_team', 'createdAt', '_id', 'master_id']),
        $unset: {},
    };

    // If a dataset is approved or pending and someone changes its fe_listed/fe_visible/isPublic to false, cancel the
    // listing/request
    if (['approved', 'pending'].includes(description.state) && (body.fe_listed === false || body.isPublic === false)) {
        updateStatement.$unset.state = true;
        unset(updateStatement.$set, 'state');
    }

    if (has(body, 'state') && !body.state) {
        updateStatement.$unset.state = true;
        unset(updateStatement.$set, 'state');
    }

    if (has(body, 'title')) {
        updateStatement.$set.uid = kebabCase(body.title);
    }

    if (has(body, 'fe_views') || body.firstImport === 6 || body.fe_excludeFields) {
        const { message } = mandatorySettings.determineMandatorySettings(
            description.columns,
            description.raw_rowObjects_coercionScheme,
            body.fe_fieldDisplayOrder || description.fe_fieldDisplayOrder,
            body.fe_excludeFields || description.fe_excludeFields,
            updateStatement,
            Object.assign({}, description.fe_views, body.fe_views),
        );

        if (message) {
            throw new PublicError(message);
        }
    }

    // Currently this will only be for aspi
    if (has(body, 'metaData.rawMethodology')) {
        updateStatement.$set.metaData.methodology = markdown.parseMarkdown(body.metaData.rawMethodology);
    }

    // Update columns if coercion scheme has been updated
    if (has(body, 'raw_rowObjects_coercionScheme')) {
        if (!permissions.includes('editFields')) {
            throw new Error('No permission to edit the fields');
        }

        if (!isEqual(body.raw_rowObjects_coercionScheme, description.raw_rowObjects_coercionScheme)) {
            dirty.push(1);

            if (description.columns) {
                updateStatement.$set.columns = updateColumns(
                    body.raw_rowObjects_coercionScheme,
                    description.columns,
                    body.columns,
                );
            }
        }
    }

    if (has(body, 'dirty')) {
        dirty.push(body.dirty);
    }

    // First import early on enterprise teams that have less than 4 tabs
    if (description._team.isEnterprise && permissions.includes('startImportJobsEarly') && has(body, 'firstImport') && body.firstImport === 2) {
        dirty.push(1);
    }

    if (has(body, 'firstImport')) {
        if (body.firstImport === 2) {
            updateStatement.$set.fe_visible = true;
        } else if (body.firstImport === 4) {
            updateStatement.$set.fe_filters = {
                ...description.fe_filters,
                fieldsNotAvailable: body.fe_fieldDisplayOrder,
            };
            // 4 - skip content tab on first import
            dirty.push(1);
        }
    }

    if (has(body, 'fe_image.field') && body.fe_image.field !== '' && body.fe_image.field !== get(description, 'fe_image.field')) {
        dirty.push(4);
    }

    if (has(body, 'fe_filters.fieldsNotAvailable') && body.fe_filters.fieldsNotAvailable !== get(description, 'fe_filters.fieldsNotAvailable')) {
        dirty.push(3);
    }

    if ((has(body, 'apiEndPoint') && get(description, 'apiEndPoint')) ||
        (has(body, 'JSONPath') && get(description, 'JSONPath'))) {
        dirty.push(1);
    }

    if (isEmpty(dirty) && has(body, 'firstImport') && body.firstImport > 5) {
        updateStatement.$set.firstImport = 0;
    }

    if (has(body, 'fe_excludeFields') && !isEqual(body.fe_excludeFields, description.fe_excludeFields)) {
        dirty.push(3);
    }

    if (has(body, 'colorMapping')) {
        updateStatement.$set.colorMapping = setSafeColorMapping(body.colorMapping);
    }

    updateStatement.$set.updatedBy = user;

    updateStatement = omitBy(updateStatement, isEmpty);

    if (!isEmpty(dirty)) {
        updateStatement.$set.lastImportInitiatedBy = user;
        updateStatement.$set.lastImportTriggeredBy = 'manual';
        updateStatement.$set.dirty = min(dirty);

        if (description.fe_image.overwrite && body.replacement) {
            updateStatement.$set.fe_image = Object.assign({}, description.fe_image, { scraped: false });
        }

        await datasource_description
            .findByIdAndUpdate(description._id, updateStatement, { select: {} });

        const jobId = await startJobIfNeeded(description._id, updateStatement.$set.dirty);

        updateStatement = { $set: { jobId } };
    }

    const { schema_id, _team, author } = description;

    description = await datasource_description
        .findByIdAndUpdate(description._id, updateStatement, { lean: true, new: true });

    Object.assign(description, { schema_id, _team, author, permissions });

    // Remove draft
    await datasource_description.remove({ master_id: description._id });

    return {
        replacement: description.replacement && description.apiEndPoint,
        description,
    };
};
module.exports.updateExistingDataset = updateExistingDataset;

function processColumns(columns, description) {
    if (isEmpty(columns)) {
        return;
    }

    uploadHelpers.checkColumnsAgainstFeExcludeFields(columns, description);

    const saveColumns = uploadHelpers.setSaveColumnsFunction(description);

    // reset the ordered column names
    description.raw_rowObjects_coercionScheme = saveColumns(columns);
    description.columns = columns;
    description.objectTitle = columns[0].name;

    const { fe_excludeFields = {} } = description;

    description.fe_excludeFields = columns.reduce((accumulator, { name }) => {
        accumulator[name] = fe_excludeFields[name] || false;

        return accumulator;
    }, {});
    description.fe_excludeFieldsObjDetail = clone(description.fe_excludeFields);
}

module.exports.processColumns = processColumns;

async function getFileStream(description) {
    if (description.fileName) {
        try {
            await datasource_file_service.keyExists(description);
        } catch (err) {
            winston.error(`s3 key not found: ${err.message}`);
            throw new Error('s3 key not found');
        }

        return datasource_file_service.getDatasource(description).createReadStream();
    }

    if (description.smartsheet) {
        return getSheet(description.author, description.smartsheet.id);
    }

    if (description.pipedrive) {
        return getDeals(description.author, description.pipedrive);
    }

    if (description.datadotworld) {
        return datadotworld.queryDataset(description.author, description.datadotworld);
    }

    if (description.salesforce) {
        return salesforce.queryDataset(description.author, description.salesforce);
    }

    return request.get(description.apiEndPoint);
}

module.exports.getFileStream = getFileStream;
