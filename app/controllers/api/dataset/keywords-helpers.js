const { countBy, orderBy, flatMap, isNil, words } = require('lodash');
const moment = require('moment');

const { formatFieldValue } = require('../../../../shared/fields');
const processed_row_objects = require('../../../models/processed_row_objects');
const datasource_description = require('../../../models/descriptions');
const { equals } = require('../../../utils/helpers');
const func = require('../../client/func');

module.exports = {
    processKeywords,
    getKeywords,
};

function processKeywords(docs, field, dataSource, units) {
    const { operation, currency, outputFormat } = dataSource.raw_rowObjects_coercionScheme[field];
    const isStringOperation = operation === 'ToString';
    const wordsList = flatMap(docs.map(({field}) => {
        const content = `${formatFieldValue(field, { operation, currency, outputFormat })}`;

        if (isStringOperation && !isNil(content)) {
            return words(content, /[^, "\(\)]+/g).filter(word => word.length > 2);
        }

        return content;
    }));

    // returns { 'hello': 5, 'world': 3 }
    const keywordsWithCounts = countBy(wordsList, word => word.toLowerCase());

    // Warning: _.map(keywordsWithCounts) has a bug and doesn't work here.
    // returns [ { word: 'hello', count: 5 }, { word: 'world', count: 3 }]
    const keywordsWithCountsArray = Object.keys(keywordsWithCounts).map((word) => ({
        word,
        count: keywordsWithCounts[word],
    }));

    return orderBy(keywordsWithCountsArray, ['count', 'word'], ['desc', 'asc']);
}


async function getKeywords(req, res) {
    const processedRowObjects_mongooseContext = processed_row_objects.Lazy_Shared_ProcessedRowObject_MongooseContext(req.params.id);
    const processedRowObjects_mongooseModel = processedRowObjects_mongooseContext.Model;
    const dataSource = await datasource_description.findById(req.params.id, 'raw_rowObjects_coercionScheme -_id');
    const path = `rowParams.${req.params.field}`;
    const match = { [path]: { $exists: true } };

    processedRowObjects_mongooseModel.aggregate([{ $match: match }, { $project: { field: `$${path}`, _id: 0 } }])
        .exec((err, docs) => {
            if (err) {
                return res.status(500).send({ error: 'An error occurred while getting keywords.' });
            }

            const { units } = req.query;
            const sortedKeywords = processKeywords(docs, req.params.field, dataSource, units);

            return res.status(200).send(sortedKeywords);
        });
}
