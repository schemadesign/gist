const winston = require('winston');

const datasource_description = require('../../../models/descriptions');
const { getOperation } = require('../../../../shared/fields');
const { UserError } = require('../../../libs/system/errors');
const { Lazy_Shared_ProcessedRowObject_MongooseContext } = require('../../../models/processed_row_objects');
const { handleError } = require('../../../utils/requests');

module.exports = {
    createField,
    removeField,
};

const getProcessedRowObjectsModel = (datasetId) => Lazy_Shared_ProcessedRowObject_MongooseContext(datasetId).Model;

const fieldsExists = ({ datasetId, field }) => datasource_description.findOne({
    _id: datasetId,
    [`fe_excludeFields.${field}`]: { $exists: true },
});

async function createField({ body: { dataType, isFieldStep }, params: { datasetId, field } }, res) {
    if (!datasetId) {
        return handleError(new UserError('Missing dataset id.'), res);
    }

    try {
        const operation = getOperation(dataType);

        if (await fieldsExists({ datasetId, field })) {
            return handleError(new UserError('A field already exists with that name.'), res);
        }

        const column = {
            name: field,
            data_type: dataType,
            operation,
            sample: '',
            createdField: true,
        };

        const $push = {
            createdFields: column,
            ['fe_filters.fieldsNotAvailable']: field,
        };

        if (!isFieldStep) {
            $push.fe_fieldDisplayOrder = field;
            $push.columns = column;
        }

        const updateData = await datasource_description
            .findByIdAndUpdate(
                datasetId,
                {
                    $push,
                    contentEdited: true,
                    [`raw_rowObjects_coercionScheme.${field}`]: { operation },
                    [`fe_excludeFields.${field}`]: false,
                    [`fe_excludeFieldsObjDetail.${field}`]: false,
                },
                { new: true },
            )
            .populate('_team');

        const ProcessedRowObjects = getProcessedRowObjectsModel(datasetId);
        const initialVal = dataType === 'Text' ? '' : null;

        await ProcessedRowObjects.update({}, { [`rowParams.${field}`]: initialVal }, { multi: true });

        return res.json(updateData);
    } catch (err) {
        const errorMessage = 'An error occurred while creating a new field';

        winston.error(errorMessage, err);

        return res.status(500).json({ error: errorMessage });
    }
}

async function removeField({ params: { datasetId, field } }, res) {
    try {
        const updateDatasetObject = {
            $unset: {
                [`raw_rowObjects_coercionScheme.${field}`]: 1,
                [`fe_excludeFields.${field}`]: 1,
                [`fe_excludeFieldsObjDetail.${field}`]: 1,
                [`fe_displayTitleOverrides.${field}`]: 1,
            },
            $pull: {
                fe_fieldDisplayOrder: field,
                createdFields: { name: field },
                columns: { name: field },
                ['fe_filters.fieldsNotAvailable']: field,
            },
        };

        const updateData = await datasource_description
            .findByIdAndUpdate(datasetId, updateDatasetObject, { new: true });


        const ProcessedRowObjects = getProcessedRowObjectsModel(datasetId);

        ProcessedRowObjects.schema.options.strict = false;
        await ProcessedRowObjects.update(
            { [`rowParams.${field}`]: { $exists: true } },
            { $unset: { [`rowParams.${field}`]: true } },
            { multi: true },
        );
        ProcessedRowObjects.schema.options.strict = true;

        return res.json(updateData);
    } catch (err) {
        const errorMessage = 'Error while deleting a new field';

        winston.error(errorMessage, err);
        return res.status(500).json({ error: errorMessage });
    }
}
