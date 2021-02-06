const request = require('request');
const Readable = require('stream').Readable;
const { PublicError } = require('../../system/errors');
const { get, concat, each, isObject, isNil, startCase } = require('lodash');

const pipedriveApiURL = 'https://api-proxy.pipedrive.com';


/**
 * Queries the Pipedrive API to get all data for an associated API, will call itself recursively by updating paginationStart
 * to query the next page of data until it has all been queried.
 * @param {String} token
 * @param {Number} paginationStart
 * @param {Array} savedDeals
 */
const getDataWithPagination = (token, endpoint, paginationStart = 0, savedDeals = []) => new Promise((resolve, reject) => {
    request.get(
        `${pipedriveApiURL}/${endpoint}?start=${paginationStart}`,
        { headers: { Authorization: token } },
        (error, response, body) => {
            if (error) {
                return reject(error);
            }

            const parsedBody = JSON.parse(body);
            savedDeals = concat(savedDeals, get(parsedBody, 'data', []));

            // Check if there are more deals
            if (get(parsedBody, 'additional_data.pagination.more_items_in_collection', false)) {
                resolve(getDataWithPagination(token, paginationStart + get(parsedBody, 'additional_data.pagination.limit', 100), savedDeals));
            } else {
                resolve(savedDeals);
            }
        }
    );
});

/**
 * Creates a read stream from a stringified JSON that is passed in.
 * https://stackoverflow.com/questions/12755997/how-to-create-streams-from-string-in-node-js
 * @param {*} data
 */
const createReadStreamFromJSON = data => {
    const readable = new Readable();
    readable._read = () => {};
    readable.push(JSON.stringify(data));
    readable.push(null);
    return readable;
};

const formatPipedriveFields = data => {
    const newData = [];
    if (isNil(get(data, 0))) {
        throw new PublicError('No Pipedrive data, please select a connection that has data.');
    }
    each(data, datum => {
        const buildObject = {};
        each(datum, (value, key) => {
            if (!isObject(value)) {
                buildObject[startCase(key)] = value;
            }
        });
        newData.push(buildObject);
    });
    return createReadStreamFromJSON(newData);
};

module.exports.getAllData = async (token, endpoint) => formatPipedriveFields(await getDataWithPagination(token, endpoint));
