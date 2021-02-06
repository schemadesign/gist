// https://raw.githubusercontent.com/hughsk/flat/master/index.js

const _ = require('lodash');

/**
 * Implements Python itertools.product method for cartesian product, equivalent to a nested for-loop
 * https://gist.github.com/cybercase/db7dde901d7070c98c48
 *
 */
const product = (vals) => {
    return vals.reduce((accumulator, value) => {
        const tmp = [];
        accumulator.forEach((a0) => {
            value.forEach((a1) => {
                tmp.push(a0.concat(a1));
            });
        });
        return tmp;
    }, [[]]);
};

/**
 * Flatten nested objects.
 *
 * @param {object|array} target input object or array of objects
 * @param {string} opt_delimiter delimiter for fields (default: '.')
 * @param {*} opt_defaultValue the default value for the column (default: '')
 * @returns {array} Returns the array of objects (rows).
 */
const flatten = (target, opt_delimiter, opt_defaultValue) => {
    const delimiter = opt_delimiter ? opt_delimiter : '.';
    const defaultValue = opt_defaultValue ? opt_defaultValue : '';

    // Recursive function.
    const step = (obj, parentKey) => {
        const baseDict = {};
        const complexItems = [];
        const veryComplexItems = [];
        _.forOwn(obj, (value, key) => {
            const newKey = parentKey ? [parentKey, key].join(delimiter) : key;
            const type = Object.prototype.toString.call(value);
            const isObject = type === '[object Object]' || type === '[object Array]';
            if (Array.isArray(value)) {
                if (value.length > 1) {
                    veryComplexItems.push([key, value]);
                } else {
                    complexItems.push([key, value]);
                }
            } else if (isObject) {
                const update = step(value, newKey);
                _.forEach(update, (up) => {
                    _.merge(baseDict, up);
                });
            } else {
                baseDict[newKey] = value;
            }
        });

        if (complexItems.length === 0 && veryComplexItems.length === 0) {
            return [baseDict];
        }

        const baseDicts = [];
        const partialDicts = [];

        _.forEach(complexItems, ([key, val]) => {
            const newKey = parentKey ? [parentKey, key].join(delimiter) : key;
            partialDicts.push(step(val[0], newKey));
        });

        const product_partialDicts = product(partialDicts);
        _.forEach(product_partialDicts, (product_tuple) => {
            const new_baseDict = _.clone(baseDict);
            _.forEach(product_tuple, (newDict) => {
                _.merge(new_baseDict, newDict);
            });
            baseDicts.push(new_baseDict);
        });

        if (veryComplexItems.length === 0) {
            return baseDicts;
        }

        const ret = [];
        const veryComplexKeys = veryComplexItems.map((item) => item[0]);
        const veryComplexVals = veryComplexItems.map((item) => item[1]);
        const product_veryComplexVals = product(veryComplexVals);
        _.forEach(product_veryComplexVals, (product_tuple) => {
            _.forEach(baseDicts, (base_dict) => {
                const newItems = _.zip(veryComplexKeys, product_tuple);
                _.forEach(newItems, ([key, val]) => {
                    const newKey = parentKey ? [parentKey, key].join(delimiter) : key;
                    const update = step(val, newKey);
                    _.forEach(update, (up) => {
                        const new_dict = _.clone(base_dict);
                        _.merge(new_dict, up);
                        ret.push(new_dict);
                    });
                });
            });
        });
        return ret;
    };

    // TODO: I suppose this needs a lot of optimization.
    // The output set of rows will have the same set of columns.
    let tmpRet = [];
    let commonColumns = [];
    if (Array.isArray(target)) {
        _.forEach(target, (obj) => {
            const flattenObj = step(obj);
            commonColumns = _.union(commonColumns, _.uniq(_.flatten(flattenObj.map((item) => _.keys(item)))));
            tmpRet = _.union(tmpRet, flattenObj);
        });
    } else {
        const flattenObj = step(target);
        commonColumns = _.union(commonColumns, _.uniq(_.flatten(flattenObj.map((item) => _.keys(item)))));
        tmpRet = _.union(tmpRet, flattenObj);
    }
    // Make that all objects has the same set of properties.
    const defaultRow = _.fromPairs(commonColumns.map((item => [item, defaultValue])));
    const composer = (objVal, srcVal) => _.isUndefined(objVal) ? srcVal : objVal;
    return tmpRet.map((item) => _.extendWith(item, defaultRow, composer));
};
module.exports.flatten = flatten;
