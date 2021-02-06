const _ = require('lodash');

// Array views - Filter obj construction
module.exports.constructedFilterObj = function (existing_filterObj, this_filterCol, this_filterVal, isThisAnActiveFilter, isMultiselectable) {
    var filterObj = {};
    var existing_filterCols = Object.keys(existing_filterObj);
    var existing_filterCols_length = existing_filterCols.length;
    let filterVals;

    for (var i = 0; i < existing_filterCols_length; i++) {
        var existing_filterCol = existing_filterCols[i];
        if (existing_filterCol == this_filterCol && !isMultiselectable) {
            continue; // never push other active values of this is filter col is already active
            // which means we never allow more than one filter on the same column at present
        }
        var existing_filterVals = existing_filterObj[existing_filterCol];

        if (typeof existing_filterVals === 'number' || typeof existing_filterVals === 'string') {
            filterObj[existing_filterCol] = existing_filterVals; // as it's not set yet
        } else if (existing_filterVals.length !== 1) {
            filterObj[existing_filterCol] = JSON.stringify(existing_filterVals);
        } else {
            filterObj[existing_filterCol] = JSON.parse(JSON.stringify(existing_filterVals));
        }
    }

    if (isThisAnActiveFilter === false) { // do not push if active, since we'd want the effect of unsetting it
        filterVals = filterObj[this_filterCol] || [];

        if (Array.isArray(filterVals) && (filterVals.indexOf(this_filterVal) == -1 || filterVals.indexOf(parseInt(this_filterVal)) == -1)) {
            filterVals.push(this_filterVal);
            filterObj[this_filterCol] = filterVals.length == 1 ? filterVals[0] : filterVals;
        } else if (typeof filterObj[this_filterCol] === 'string' && filterObj[this_filterCol] != this_filterVal) {
            var originalVal = filterObj[this_filterCol];
            filterObj[this_filterCol] = this_filterVal;
            if (isMultiselectable) {
                let obj;
                try {
                    obj = JSON.parse(originalVal);
                } catch (e) {
                }
                if (Array.isArray(obj)) {
                    obj.push(this_filterVal);
                    filterObj[this_filterCol] = JSON.stringify(obj);
                } else {
                    filterObj[this_filterCol] = JSON.stringify(['' + originalVal, '' + this_filterVal]);
                }
            }
        } else {
            filterObj[this_filterCol] = this_filterVal;
        }
    } else if (isMultiselectable) {
        try {
            filterVals = JSON.parse(filterObj[this_filterCol]);
        } catch (e) {
        }
        if (Array.isArray(filterVals)) {
            if (filterVals.indexOf(this_filterVal) !== -1) {
                let index = filterVals.indexOf(this_filterVal);
                filterVals.splice(index, 1);

                if (filterVals.length > 1) {
                    filterObj[this_filterCol] = JSON.stringify(filterVals);
                } else if (filterVals.length == 1) {
                    filterObj[this_filterCol] = filterVals[0];
                }
            } else if (filterVals.indexOf(parseInt(this_filterVal)) !== -1) {
                let index = filterVals.indexOf(parseInt(this_filterVal));
                filterVals.splice(index, 1);

                if (filterVals.length > 1) {
                    filterObj[this_filterCol] = JSON.stringify(filterVals);
                } else if (filterVals.length == 1) {
                    filterObj[this_filterCol] = filterVals[0];
                }
            }
        } else if (_.isPlainObject(filterVals) && _.isEqual(filterVals, this_filterVal)) {
            delete filterObj[this_filterCol];
        } else if (this_filterVal == '' + filterObj[this_filterCol]) {
            delete filterObj[this_filterCol];
        }
    }

    return filterObj;
};
