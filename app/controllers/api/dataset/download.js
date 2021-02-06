const JSONStream = require('JSONStream');
const es = require('event-stream');
const stringify = require('csv-stringify');
const mime = require('mime-types');
const { mapKeys, defaultTo } = require('lodash');
const { getJsonToLinesStream } = require('./index-helpers');
const Description = require('./../../../models/descriptions');
const { Lazy_Shared_ProcessedRowObject_MongooseContext } = require('./../../../models/processed_row_objects');
const DatasourceFileService = require('./../../../libs/utils/aws-datasource-files-hosting');

/**
 * Picks row params from processed row object
 */
const getExtractRowParamsStream = () => es.mapSync(data => data.rowParams);

/**
 * Unflattens flattened object
 */
const getStringStream = () => es.mapSync(data => data);

/**
 * Overrides column names with values from displayTitleOverrides argument
 */
const getColumnMappingStream = (displayTitleOverrides = {}) =>
    es.mapSync(data => mapKeys(data, (value, key) => defaultTo(displayTitleOverrides[key], key)));

/**
 * Fetches description or throws error
 */
const getDescription = async ({ params, user, subdomains }) => {
    let description;

    try {
        description = await Description.findById(params.id).populate('_team');
    } catch (e) {
        // Attempt to find the description by using the id as the uid
        try {
            let temp_description = await Description.findByUidAndTeamSubdomain(params.id, defaultTo(subdomains[0], ''));
            description = await Description.findById(temp_description).populate('_team');
        } catch (e) {
            throw { code: 500, message: e };
        }
    }

    if (!description) {
        throw { code: 404, message: `downloadOriginal dataset not found: ${params.id}` };
    }

    if (!(await description.canBeDownloadedBy(user))) {
        throw { code: 403, message: `downloadOriginal not permitted: ${params.id}` };
    }

    if (description.schema_id) {
        description = Description.consolidateDescriptions(description);
    }

    if (description.connection) {
        let childDescription = await Description.findOne({ schema_id: description._id }, { format: 1 });
        description.format = childDescription.format;
    }

    return description;
};

/**
 * Downloads the original CSV or TSV that was uploaded to AWS.
 */
module.exports.downloadOriginal = async (req, res) => {
    try {
        let description = await getDescription(req);
        description = await description.deepPopulate('schema_id schema_id._team');

        res.status(200);
        res.setHeader('Content-Type', mime.lookup(description.format));
        res.setHeader('Content-Disposition', `attachment;filename=${encodeURIComponent(description.fileName)}`);

        return DatasourceFileService
            .getDatasource(description)
            .createReadStream()
            .pipe(res);
    } catch (err) {
        return res.status(err.code || 500).send(err.message || `Download original error: ${err}`);
    }
};

/**
 * Triggers the writing of a given dataset and pipes to the response.
 */
module.exports.downloadModified = async (req, res) => {
    try {
        const description = await getDescription(req);

        let fileName = description.fileName || `${description.title}.${description.format.toLowerCase()}`;
        fileName = `edited-${Date.now()}-${fileName}`;

        res.status(200);
        res.setHeader('Content-Type', mime.lookup(description.format));
        res.setHeader('Content-Disposition', `attachment;filename=${encodeURIComponent(fileName)}`);

        const { Model: ProcessedRowObjects } = Lazy_Shared_ProcessedRowObject_MongooseContext(req.params.id);

        const rowsStream = ProcessedRowObjects
            .find({}, { rowParams: true })
            .cursor()
            .pipe(getExtractRowParamsStream())
            .pipe(getColumnMappingStream(description.fe_displayTitleOverrides));

        if (description.format === 'JSON') {
            return rowsStream
                .pipe(getStringStream())
                .pipe(JSONStream.stringify())
                .pipe(res);
        }

        return rowsStream
            .pipe(getJsonToLinesStream())
            .pipe(stringify({ delimiter: description.format === 'TSV' ? '\t' : ',' }))
            .pipe(res);
    } catch (err) {
        return res.status(err.code || 500).send(err.message || `Download modified error: ${err}`);
    }
};

module.exports.downloadLatestModified = async (req, res) => {
    try {
        const { uid, _team } = req.params;
        const description = await Description.findOne({
            uid, _team, $or: [{ replaced: false }, { replaced: { $exists: false } }],
        });

        const fileName = `${description.title}.${description.format.toLowerCase()}`;

        res.status(200);
        res.setHeader('Content-Type', mime.lookup(description.format));
        res.setHeader('Content-Disposition', `attachment;filename=${encodeURIComponent(fileName)}`);

        const { Model: ProcessedRowObjects } = Lazy_Shared_ProcessedRowObject_MongooseContext(description._id);

        const rowsStream = ProcessedRowObjects
            .find({}, { rowParams: true })
            .cursor()
            .pipe(getExtractRowParamsStream())
            .pipe(getColumnMappingStream(description.fe_displayTitleOverrides));

        if (description.format === 'JSON') {
            return rowsStream
                .pipe(getStringStream())
                .pipe(JSONStream.stringify())
                .pipe(res);
        }

        return rowsStream
            .pipe(getJsonToLinesStream())
            .pipe(stringify({ delimiter: description.format === 'TSV' ? '\t' : ',' }))
            .pipe(res);
    } catch (e) {
        return res.status(500).send('Download error: during process data');
    }
};
