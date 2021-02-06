const winston = require('winston');

const awsHosting = require('../../libs/utils/aws-image-hosting');

module.exports.getS3Asset = (req, res) => {
    // After passing the request, param 'key' is separated into two parts
    // Combine both to recreate the full key
    const key = `${req.params.key}${req.params[0]}`;

    awsHosting.getAssetByKey(key, (err, data) => {
        if (err) {
            winston.debug('An error occurred while getting the asset', err);
            return res.status(err.statusCode || 500).send('An error occurred while getting the asset');
        }

        res.writeHead(200, { 'Content-Type': data.ContentType });
        res.write(data.Body, 'binary');
        res.end(null, 'binary');
    });
};
