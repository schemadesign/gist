const request = require('request');
const { defaultTo } = require('lodash');

const socrataLimit = 21;
const socrataAPI = 'http://api.us.socrata.com/api/catalog/v1';


module.exports.findDatasets = (req, res) => {
    request.get(
        `${socrataAPI}?q=${encodeURI(req.query.q)}&min_should_match=3%3C60%25&offset=${defaultTo(req.query.offset, '0')}&limit=${socrataLimit}`,
        {},
        (error, response, body) => {
            if (error) {
                res.status(400).send(error);
            }

            return res.json(JSON.parse(body));
        });
};
