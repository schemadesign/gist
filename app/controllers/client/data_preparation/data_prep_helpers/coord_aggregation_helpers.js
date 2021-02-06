/**
 * Creates projectionObject which can be appended to aggregation query
 * @param {array} aggregationOperators
 * @param {string} coordTitle
 * @param {string} latField
 * @param {string} lngField
 * @param {string} dLatField
 * @param {string} dLongField
 * @param {*} options

 * returns {object}
 */


module.exports.aggregateCoordPoints = (coordTitle, options, latField, lngField, dLatField, dLongField) => {
    let projectionObject = {
        _id: 1,
        coordTitle: '$rowParams.' + coordTitle,
        latField: '$rowParams.' + latField,
        lngField: '$rowParams.' + lngField,
        dLatField: '$rowParams.' + dLatField,
        dLonField: '$rowParams.' + dLongField,
        coordRadiusValue: '$rowParams.' + options.aggregateBy_realColumnName
    };

    return projectionObject;
};

/**
 * Appends detail fields to param projectionObject
 * First 3 fields from the field sort order which are not excluding from detail view display
 * projected detail fields indicated by preceding '__detail__'

 * returns {object}
 */

module.exports.projectDetailFields = (projectionObject, detailFieldList, fieldDisplayOrder) => {

    let addedDetailFields = 0;

    fieldDisplayOrder.forEach(field => {
        // query a maximum of 3 detail fields
        if (detailFieldList[field] === false && addedDetailFields < 3) {
            projectionObject['__detail__' + field] = '$rowParams.' + field;
            addedDetailFields += 1;
        }
    });

    return projectionObject;
};

