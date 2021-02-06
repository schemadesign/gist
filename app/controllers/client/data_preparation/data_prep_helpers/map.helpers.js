const { get } = require('lodash');
const { AGGREGATE_BY_DISABLED_COLUMN_NAME, AGGREGATE_BY_DEFAULT_COLUMN_NAME } = require('../../config');
const processed_row_objects = require('../../../../models/processed_row_objects');
const BUBBLE_MAP = 'bubble';

module.exports = {
    getMaxValue,
};

async function getMaxValue({ aggregateBy_realColumnName, mapBy_realColumnName }, { _id: id, fe_views }) {
    try {
        const isDisabledOrDefaultColumn = aggregateBy_realColumnName === AGGREGATE_BY_DISABLED_COLUMN_NAME ||
            aggregateBy_realColumnName === AGGREGATE_BY_DEFAULT_COLUMN_NAME;
        const isBubbleMap = get(fe_views, 'views.map.mapStyle') === BUBBLE_MAP;

        if (isDisabledOrDefaultColumn && isBubbleMap) {
            return 1;
        }

        const aggregateQuery = () => {
            const mapByPath = `$rowParams.${mapBy_realColumnName}`;
            const aggregateByPath = `$rowParams.${aggregateBy_realColumnName}`;
            const sortAndLimit = [
                { $sort: { count: -1 } },
                { $limit: 1 },
            ];

            if (isBubbleMap) {
                return [
                    {
                        $project: {
                            count: aggregateByPath,
                        },
                    },
                    ...sortAndLimit,
                ];
            }

            return [
                { $unwind: mapByPath },
                {
                    $group: {
                        _id: mapByPath,
                        count: { $sum: isDisabledOrDefaultColumn ? 1 : aggregateByPath },
                    },
                },
                ...sortAndLimit,
            ];
        };

        const processedRowObjects_mongooseContext = processed_row_objects.Lazy_Shared_ProcessedRowObject_MongooseContext(id);
        const processedRowObjects_mongooseModel = processedRowObjects_mongooseContext.Model;
        const elementWithMaxValue = await processedRowObjects_mongooseModel
            .aggregate(aggregateQuery())
            .allowDiskUse(true)
            .exec();

        return get(elementWithMaxValue, '[0].count', 0);
    } catch (e) {
        return 0;
    }

}
