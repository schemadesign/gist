var _ = require('lodash');

module.exports.getCoercionOperations = function(settingName, viewSettings) {

    // Default to selecting all columns / don't restrict by coercion operation
    var coercionOperations;

    // Unless the view setting specifies a restriction
    var setting = _.find(viewSettings, ['name', settingName]);
    if (setting && setting.restrictColumnDataType) {

        // restrictColumnDataType will be an array or string
        coercionOperations = typeof setting.restrictColumnDataType === 'string' ? [setting.restrictColumnDataType] : setting.restrictColumnDataType;

        // convert between representations
        // integer => ToInteger
        // date => ToDate
        // float => ToFloat
        // percent => ToPercent
        coercionOperations = coercionOperations.map(function(op) {
            return 'To' + _.capitalize(op);
        });
    }

    return coercionOperations;
};
