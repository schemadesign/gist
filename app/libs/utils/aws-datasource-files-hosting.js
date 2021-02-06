const winston = require('winston');
const aws = require('aws-sdk');
const fs = require('fs');
const _ = require('lodash');

const bucket = process.env.DO_S3_BUCKET;
const endpoint = new aws.Endpoint(process.env.DO_S3_ENDPOINT);
const s3 = new aws.S3({
    endpoint,
    accessKeyId: process.env.DO_ACCESS_KEY_ID,
    secretAccessKey: process.env.DO_SECRET_ACCESS_KEY,
});
const debugS3 = false;

function _uploadAncillaryFile(filePath, fileName, contentType, teamSubdomin, datasetId, callback) {
    const file = fs.createReadStream(filePath);
    const key = getAncillaryAssetKey(teamSubdomin, datasetId, fileName);
    const params = {
        Bucket: bucket,
        Key: key,
        ContentType: contentType,
        Body: file,
        ACL: 'private',
    };

    debug(`Uploading the ancillary file to S3: ${key}`);

    s3.upload(params, function (err) {
        if (err) {
            return callback(err);
        }

        callback();
    });
}

module.exports.uploadAncillaryFile = _uploadAncillaryFile;

function _copyAncillaryFile(team_subdomain, originId, destinationId, fileName, callback) {
    const key = getAncillaryAssetKey(team_subdomain, destinationId, fileName);
    const params = {
        Bucket: bucket,
        CopySource: getAncillaryAssetKey(team_subdomain, originId, fileName, bucket),
        Key: key,
    };

    debug(`Copying the ancillary file from S3: ${key}`);

    s3.copyObject(params, function (err) {
        if (err) {
            winston.error(`S3: error copying datasource: ${err.message}`);
            return callback(err);
        }

        callback();
    });
}

module.exports.copyAncillaryFile = _copyAncillaryFile;

function _uploadDataSource(filePath, newFilename, contentType, teamSubdomin, datasetId, callback) {
    const file = fs.createReadStream(filePath);
    const key = getDatasourceKey(teamSubdomin, datasetId, newFilename);

    const params = {
        Bucket: bucket,
        Key: key,
        ContentType: contentType,
        Body: file,
        ACL: 'private',
    };

    debug(`Uploading the datasource to S3: ${key}`);

    s3.upload(params, function (err) {
        if (err) {
            return callback(err);
        }

        callback();
    });
}

module.exports.uploadDataSource = _uploadDataSource;

function _copySampleDatasource(datasetToDuplicateId, fileName, datasetId, teamSubdomain, callback) {
    const key = getDatasourceKey(teamSubdomain, datasetId, fileName);
    const params = {
        Bucket: bucket,
        CopySource: getDatasourceKey('sampleteam', datasetToDuplicateId, fileName, bucket),
        Key: key,
    };

    debug(`Copying the sample datasource from S3: ${key}`);

    s3.copyObject(params, function (err) {
        if (err) {
            winston.error(`S3: error copying sample datasource: ${err.message}`);
            return callback(err);
        }

        callback();
    });
}

module.exports.copySampleDatasource = _copySampleDatasource;

function _copyDatasource(team_subdomain, fileName, copyFromId, copyToId, callback) {
    const keyFrom = getDatasourceKey(team_subdomain, copyFromId, fileName, bucket);
    const keyTo = getDatasourceKey(team_subdomain, copyToId, fileName);
    const params = {
        Bucket: bucket,
        CopySource: keyFrom,
        Key: keyTo,
    };

    debug(`Copying the datasource from S3: from ${keyFrom} to ${keyTo}`);

    s3.copyObject(params, function (err, data) {
        if (err) {
            winston.error(`S3: error copying datasource: ${err.message}`);
            return callback(err);
        }

        callback();
    });
}

module.exports.copyDatasource = _copyDatasource;

function _getDatasource(description) {
    const key = getDatasourceKey(description._team.subdomain, description.schemaId || description._id, description.fileName);

    const param = {
        Bucket: bucket,
        Key: key,
    };
    debug(`Reading the datasource from S3: ${key}`);

    return s3.getObject(param);
}

module.exports.getDatasource = _getDatasource;

function _getAncillaryFile(description) {
    const key = getAncillaryAssetKey(description._team.subdomain, description._id, description.ancillaryFile);

    const param = {
        Bucket: bucket,
        Key: key,
    };
    debug(`Reading ancillary file from S3: ${key}`);

    return s3.getObject(param);
}

module.exports.getAncillaryFile = _getAncillaryFile;

function keyExists(description, callback = _.noop) {
    return new Promise((resolve, reject) => {
        const key = getDatasourceKey(description._team.subdomain, description.schema_id || description._id, description.fileName);

        const params = {
            Bucket: bucket,
            Key: key,
        };
        debug(`Verifying the datasource from S3: ${key}`);

        s3.headObject(params, (err) => {
            if (err) {
                reject(err);
                return callback(err, false);
            }

            resolve();
            callback(null, true);
        });
    });
}

module.exports.keyExists = keyExists;

function _deleteDataset(description, callback) {
    const team_subdomain = description._team.subdomain;
    const key = getDatasetKey(team_subdomain, description.id);
    const param = {
        Bucket: bucket,
        Prefix: key,
    };

    debug(`Removing the datasource from S3: ${key}`);

    s3.listObjects(param, function (err, data) {
        if (err) {
            return callback(err);
        }

        if (!data.Contents) {
            return callback();
        }

        if (data.Contents.length === 0) {
            return callback();
        }

        const param = { Bucket: bucket };
        param.Delete = { Objects: [] };

        data.Contents.forEach(function (content) {
            param.Delete.Objects.push({ Key: content.Key });
        });

        s3.deleteObjects(param, function (err, data) {
            if (err) {
                return callback(err);
            }

            if (!data.Deleted) {
                return callback();
            }

            if (data.Deleted.length === 1000) {
                return _deleteDataset(description, callback);
            }

            callback();
        });
    });
}

module.exports.deleteDataset = _deleteDataset;

function _deleteTeam(subdomain, callback) {
    const param = {
        Bucket: bucket,
        Prefix: getTeamKey(subdomain),
    };

    s3.listObjects(param, function (err, data) {
        if (err) {
            return callback(err);
        }

        if (!data.Contents) {
            return callback();
        }

        if (data.Contents.length === 0) {
            return callback();
        }

        const param = { Bucket: bucket };
        param.Delete = { Objects: [] };

        data.Contents.forEach(function (content) {
            param.Delete.Objects.push({ Key: content.Key });
        });

        s3.deleteObjects(param, function (err, data) {
            if (err) {
                return callback(err);
            }

            if (!data.Contents) {
                return callback();
            }

            if (data.Contents.length === 1000) {
                return _deleteTeam(subdomain, callback);
            }

            callback();
        });
    });
}

module.exports.deleteTeam = _deleteTeam;

function _deleteObject(key, callback) {
    const params = {
        Bucket: bucket,
        Key: key,
    };

    s3.deleteObject(params, function (err, data) {
        if (err) {
            return callback(err);
        }

        callback(null, data);
    });
}

module.exports.deleteObject = _deleteObject;

function getDatasourceKey(subdomain, datasetId, fileName, bucket = null) {
    return getDatasetKey(subdomain, datasetId, `datasources/${fileName}`, bucket);
}

function getAncillaryAssetKey(subdomain, datasetId, fileName, bucket = null) {
    return getDatasetKey(subdomain, datasetId, `assets/ancillary/${fileName}`, bucket);
}

function getDatasetKey(subdomain, datasetId, resourceName = '', bucket = null) {
    return getTeamKey(subdomain, `datasets/${datasetId}/${resourceName}`, bucket);
}

function getTeamKey(subdomain, resourceName = '', bucket = null) {
    const prefix = bucket ? `${bucket}/` : '';

    return `${prefix}${subdomain}/${resourceName}`;
}

function debug(msg) {
    if (debugS3) {
        winston.debug(msg);
    }
}
