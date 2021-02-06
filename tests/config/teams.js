var ObjectId = require('mongodb').ObjectID;

module.exports.team1 = {
    _id: ObjectId('5a42bf30d3bc0b20648290e1'),
    updatedAt: '2017-12-26T21:43:10.717Z',
    createdAt: '2017-12-26T21:29:20.384Z',
    title: 'Glitter',
    subdomain: 'glitter',
    admin: [ObjectId('5a42bf07d3bc0b20648290e0')],
    superTeam: true,
    datasourceDescriptions: [
        ObjectId('5a42c26e303770207ce8f83b'),
        ObjectId('5a4ed5572a1cf29b85201bb3'),
    ],
    pages: [ObjectId('aaa26b456f8073766713bcee')],
    font: 'centrano2',
    __v: 2,
};

module.exports.team2 = {
    _id: ObjectId('5a42fba8999d2a26d50fea64'),
    updatedAt: '2017-12-27T01:57:42.971Z',
    createdAt: '2017-12-27T01:47:20.205Z',
    title: 'Maitland McConnell',
    subdomain: 'user',
    admin: [ObjectId('5a42fb9e29232d26d47136dc')],
    superTeam: true,
    datasourceDescriptions: [
        ObjectId('5a42fd33999d2a26d50fea65'),
        ObjectId('5a42fdca29232d26d47136dd'),
        ObjectId('5a42fe1629232d26d4713775'),
    ],
    sites: [ObjectId('5abeac00ef9ae15d1647721b')],
    font: 'centrano2',
    __v: 3,
    hasEnterpriseLicense: false,
};

module.exports.teamApptension = {
    _id: ObjectId('5aaf894291680200354d1360'),
    updatedAt: '2018-03-19T14:12:14.778Z',
    createdAt: '2018-03-19T09:56:18.852Z',
    title: 'special',
    subdomain: 'special',
    admin: [ObjectId('5aaf893591680200354d135f')],
    sites: [],
    pages: [],
    datasourceDescriptions: [
        ObjectId('5aaf8964a41dfb003f3dfc2a'),
    ],
    colorPalette: [],
    font: 'centrano2',
    __v: 1,
    hasEnterpriseLicense: false,
};

