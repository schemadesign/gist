import { ObjectId } from 'mongodb';


export const team1 = {
    _id: ObjectId('5a42bf30d3bc0b20648290e1'),
    updatedAt: '2017-12-26T21:43:10.717Z',
    createdAt: '2017-12-26T21:29:20.384Z',
    title: 'Glitter',
    subdomain: 'glitter',
    admin: [ObjectId('5a42bf07d3bc0b20648290e0')],
    superTeam: true,
    datasourceDescriptions: [
        ObjectId('5a42c26e303770207ce8f83b'),
        ObjectId('5b033d64ef29594d18bb18aa'),
    ],
    font: 'centrano2',
    __v: 2,
    pages: [
        ObjectId('5ac26b456f8073766713bcee'),
        ObjectId('5ac26b3d6f8073766713bced'),
        ObjectId('5ac26b506f8073766713bcef'),
        ObjectId('5ac26b636f8073766713bcf0'),
        ObjectId('aaa26b456f8073766713bcee'),
    ],
};

export const team2 = {
    _id: ObjectId('5a42fba8999d2a26d50fea64'),
    updatedAt: '2017-12-27T01:57:42.971Z',
    createdAt: '2017-12-27T01:47:20.205Z',
    title: 'Maitland McConnell',
    subdomain: 'user',
    admin: [ObjectId('5a42fb9e29232d26d47136dc')],
    superTeam: true,
    hasEnterpriseLicense: false,
    datasourceDescriptions: [
        ObjectId('5a42fd33999d2a26d50fea65'),
        ObjectId('5a42fdca29232d26d47136dd'),
        ObjectId('5a42fe1629232d26d4713775'),
        ObjectId('5b07033050f5c886278b6d2d'),
    ],
    font: 'centrano2',
    __v: 3,
};

export const team3 = {
    _id: ObjectId('5ab2eeae4bc18d296ba983d6'),
    updatedAt: '2017-12-26T21:43:10.717Z',
    createdAt: '2017-12-26T21:29:20.384Z',
    title: 'Third one',
    subdomain: 'third',
    admin: [ObjectId('5ab2ee9c4bc18d296ba983d5')],
    superTeam: true,
    hasEnterpriseLicense: false,
    datasourceDescriptions: [],
    font: 'centrano2',
    __v: 2,
    pages: [],
};

export const team4 = {
    _id: ObjectId('5ab2eeae4bc18d296ba983d7'),
    updatedAt: '2017-12-26T21:43:10.717Z',
    createdAt: '2017-12-26T21:29:20.384Z',
    title: 'Fourth one',
    subdomain: 'fourth',
    admin: [ObjectId('5ab2ee9c4bc18d296ba983d5')],
    superTeam: false,
    hasEnterpriseLicense: false,
    datasourceDescriptions: [],
    font: 'centrano2',
    __v: 2,
    pages: [],
};

export const versionTeam = {
    _id: ObjectId('5abacfd6d343e33e9a0d61ea'),
    updatedAt: '2018-06-25T18:42:35.013Z',
    createdAt: '2018-03-27T23:12:22.349Z',
    title: 'Versions',
    subdomain: 'versions',
    admin: [ObjectId('5abacfc4a251293e9869cdfd')],
    superTeam: true,
    hasEnterpriseLicense: false,
    sites: [],
    pages: [],
    datasourceDescriptions: [
        ObjectId('5b313181ab3ff414bf623791'),
        ObjectId('5b3133c85fc24614bd922d6c'),
        ObjectId('5b31379a52e34d16f914e8bf'),
    ],
    colorPalette: [],
    font: 'centrano2',
    __v: 160,
    brandColor: {
        label: '#2A2A2A',
        select: '#2A2A2A',
    },
};
