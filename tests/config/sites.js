var ObjectId = require('mongodb').ObjectId;


module.exports.newSite = {
    __v: 0,
    createdBy: ObjectId('5abacfc4a251293e9869cdfd'),
    team: ObjectId('5a42fba8999d2a26d50fea64'),
    slug: 'newSite',
    title: 'newSite',
    _id: ObjectId('5abeac00ef9ae15d1647721a'),
    published: false,
    brandColor: { accent: '#005CB5' },
    createdAt: '2018-03-30T21:28:32.371Z',
    updatedAt: '2018-03-30T21:28:32.371Z',
    homepage: ObjectId('6ac26b456f8073766713bcee'),
    pages: [
        ObjectId('6ac26b3d6f8073766713bced'),
        ObjectId('6ac26b506f8073766713bcef')
    ]
}

module.exports.site1 = {
    _id: ObjectId('5abeac00ef9ae15d1647721b'),
    createdBy: ObjectId('5a42bf07d3bc0b20648290e0'),
    team: ObjectId('5a42bf30d3bc0b20648290e1'),
    slug: 'site-1',
    title: 'site 1',
    published: false,
    brandColor: {
        accent: '#005CB5'
    },
    createdAt: '2018-03-30T21:28:32.371Z',
    updatedAt: '2018-04-02T17:42:12.091Z',
    pages: [
        ObjectId('5ac26b506f8073766713bcef'),
        ObjectId('5ac26b636f8073766713bcf0'),
        ObjectId('5ac26b3d6f8073766713bced')
    ],
    __v: 2,
    homepage: ObjectId('5ac26b456f8073766713bcee')
}

module.exports.article1HostSite = {
    _id: ObjectId('5abeac00ef9ae15d16477211'),
    createdBy: ObjectId('5a42fb9e29232d26d47136dc'),
    team: ObjectId('5a42bf30d3bc0b20648290e1'),
    slug: 'user',
    title: 'user',
    published: false,
    brandColor: {
        accent: '#005CB5'
    },
    createdAt: '2018-03-30T21:28:32.371Z',
    updatedAt: '2018-04-02T17:42:12.091Z',
    pages: [
        ObjectId('aaa26b456f8073766713bcee')
    ],
    __v: 2,
    homepage: ObjectId('5ac26b456f8073766713bcee')
}

