const request = require('request');
var winston = require('winston');
var aws = require('aws-sdk');
var sharp = require('sharp');
var async = require('async');
const _ = require('lodash');

const { VIEW_TYPE_OBJECT_DETAILS, VIEW_TYPE_GALLERY, VIEW_TYPE_TIMELINE } = require('../../config/views.config');

const BUCKET = process.env.DO_S3_BUCKET;
const endpoint = new aws.Endpoint(process.env.DO_S3_ENDPOINT);
const S3 = new aws.S3({
    endpoint,
    accessKeyId: process.env.DO_ACCESS_KEY_ID,
    secretAccessKey: process.env.DO_SECRET_ACCESS_KEY,
    signatureVersion: 'v4',
    region: 'nyc3',
});

module.exports = {
    uploadToS3,
    signedUrlForPutObject,
    getAllIconsForTeam,
    hostImageLocatedAtRemoteURL,
    copyPageAssets,
    copyDatasetAsset,
    getAssetByKey,
};

function uploadToS3(key, response, callback) {

    var payload = {
        Bucket: BUCKET,
        Key: key,
        Body: response,
        ACL: 'public-read',
    };

    S3.upload(payload, function (err, data) {
        if (err) {
            winston.error('AWS S3 write stream error');
            return callback(err);
        }
        return callback(null, data);
    });
}

function _appendKeyToBucket(key) {
    return 'https://' + BUCKET + '.' + process.env.DO_S3_ENDPOINT + '/' + key;
}

function getImageFormat(headers) {
    const imageFormat = _.get(headers, 'content-type', '').split(';')[0].split('/')[1];

    return imageFormat === 'jpg' ? 'jpeg' : imageFormat;
}

function getImageAtUrl(remoteImageSourceURL, callback) {
    var options = {
        url: remoteImageSourceURL,
        encoding: null,
        timeout: 10000,
    };

    request.get(options, function (err, response, data) {
        if ((err && ['ENOTFOUND', 'ETIMEDOUT'].includes(err.code)) || !response) {
            winston.info(`returning url as null, since Could not read the remote image ${remoteImageSourceURL}: ${err}`);
            return callback(null, null);
        }

        if (err) {
            return callback(err, null);
        }

        const imageFormat = getImageFormat(response.headers);

        if (_.get(sharp, `format.${imageFormat}`)) {
            return callback(null, data);
        }

        return callback(null, null);
    });
}

function signedUrlForPutObject(key, fileType, callback) {
    if (fileType.indexOf('svg') >= 0) { //fix space when uploading svg error
        fileType = 'image/svg+xml';
    }

    var params = {
        Bucket: BUCKET,
        Key: key,
        ACL: 'public-read',
        ContentType: fileType,
    };

    S3.getSignedUrl('putObject', params, function (err, signedUrl) {
        callback(err, { putSignedUrl: signedUrl, publicUrl: _appendKeyToBucket(key) });
    });
}

function getAllIconsForTeam(teamSubdomain, callback) {
    S3.listObjects({
        Bucket: BUCKET,
        Prefix: teamSubdomain + '/assets/icon/',
        Marker: teamSubdomain + '/assets/icon/',
    }, function (err, data) {
        if (err) {
            callback(err);
        } else {
            var listOfUrls = [];
            var objects = data.Contents;

            for (var i = 0; i < objects.length; i++) {
                var objKey = objects[i].Key;

                var url = _appendKeyToBucket(objKey);

                listOfUrls.push(url);
            }
            callback(null, listOfUrls);
        }
    });

}

async function _proceedToStreamToHost(imageUrl, resize, folder, docPKey, callback) {
    try {
        const image = sharp(imageUrl);
        const metadata = await image.metadata();

        if (!metadata) {
            winston.info('returning url as null, since Could not read the remote image metadata');
            return callback();
        }

        const { width, hasAlpha } = metadata;
        const size = width < resize.size ? width : resize.size;
        const whiteColorRGB = { r: 255, g: 255, b: 255 };
        const background = hasAlpha ? { ...whiteColorRGB, alpha: 1 } : whiteColorRGB;
        const resizeConfig = { fit: 'contain', background };
        const resizedImage = resize.cropped ? image.resize(size, size, resizeConfig) : image.resize(size);
        const bufferedImage = await resizedImage.toBuffer();
        const keyName = `${folder}${resize.view}/${docPKey}`;

        uploadToS3(keyName, bufferedImage, callback);
    } catch (error) {
        winston.error('has err: ' + error);
        callback(error);
    }
}

function hostImageLocatedAtRemoteURL(folder, remoteImageSourceURL, overwrite, destinationFilenameSansExt, callback) {
    const recommendedSizes = [
        { size: 763, cropped: false, view: VIEW_TYPE_OBJECT_DETAILS },
        { size: 280, cropped: false, view: VIEW_TYPE_GALLERY },
        { size: 155, cropped: true, view: VIEW_TYPE_TIMELINE },
    ];

    getImageAtUrl(remoteImageSourceURL, function (err, imageBuffer) {
        if (err || !imageBuffer) {
            return callback(err);
        } else {
            async.each(recommendedSizes, function (size, cb) {
                if (overwrite) {
                    _proceedToStreamToHost(imageBuffer, size, folder, destinationFilenameSansExt, cb);
                } else {
                    const keyName = `${folder}${size.view}/${destinationFilenameSansExt}`;
                    const params = {
                        Bucket: BUCKET,
                        Key: keyName,
                    };
                    try {
                        S3.headObject(params, function (err, data) {
                            if (err || !data) {
                                winston.error('Head object err: ' + err);
                            } else {
                                winston.info(' File already uploaded and overwrite is false for object with pKey ' + destinationFilenameSansExt);
                                cb();
                            }
                        });
                    } catch (err) {

                        if (err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
                            _proceedToStreamToHost(imageBuffer, size, folder, destinationFilenameSansExt, cb);
                        } else {
                            winston.error(err);
                            cb(err);
                        }
                    }
                }
            }, callback);
        }
    });

}

function copyPageAssets(args, callback) {
    var params = {
        Bucket: BUCKET,
        CopySource: BUCKET + '/' + args.subdomain + '/websites/' + args.originalWebsiteId + '/pages/' + args.originalPageId + '/' + args.imageType + '/' + args.fileName,
        Key: args.subdomain + '/websites/' + args.websiteId + '/pages/' + args.pageId + '/' + args.imageType + '/' + args.fileName,
        ACL: 'public-read',
    };

    S3.copyObject(params, function (err) {
        if (err) {
            winston.error('\' error copying page asset with params: \'', params);
            return callback(err);
        } else {
            callback();
        }
    });
}

async function copyDatasetAsset({ fromSubdomain, toSubdomain, fromId, toId, source, fileName }, callback) {
    const getUrl = ({ id, BUCKET, subdomain = fromSubdomain }) =>
        `${BUCKET ? `${BUCKET}/` : ''}${subdomain}/datasets/${id}/${source}/${fileName}`;
    const copySource = getUrl({ id: fromId, BUCKET });
    const key = getUrl({ id: toId, subdomain: toSubdomain });

    const params = {
        Bucket: BUCKET,
        CopySource: copySource,
        Key: key,
        ACL: 'public-read',
    };

    try {
        await S3.copyObject(params).promise();

        callback(null);
    } catch (e) {
        winston.error(`S3: error copying dataset asset: ${e}`);

        callback(e);
    }
}

function getAssetByKey(key, callback) {
    const params = {
        Bucket: BUCKET,
        Key: key,
    };

    S3.getObject(params, function (err, data) {
        if (err) {
            return callback(err);
        } else {
            return callback(null, data);
        }
    });
}
