const { pick, isObject, reduce, isArray } = require('lodash');
const { Response } = require('superagent');

const omitDeep = (input, excludeKeys, accumulator = {}) => reduce(input, (output, value, key) => {
    if (isObject(value)) {
        output[key] = omitDeep(value, excludeKeys, isArray(value) ? [] : {});
    } else if (!excludeKeys.includes(key)) {
        output[key] = value;
    }

    return output;
}, accumulator);

module.exports = {
    test(value) {
        return value instanceof Response;
    },

    print(value, serialize) {
        let pickKeys = ['statusCode', 'text'];
        const omitKeys = ['createdAt', 'updatedAt', '_id', '__v'];

        if (['application/json', 'text/html'].includes(value.type)) {
            pickKeys = ['statusCode', 'body'];
        }

        return serialize(omitDeep(pick(value, pickKeys), omitKeys));
    },
};
