const AWSMock = require('mock-aws-s3');

AWSMock.config.basePath = `${__dirname}/tmp/buckets`;

module.exports = AWSMock;
