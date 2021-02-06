import { ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';

import { visualizationEditor, user2 } from './users';

export const token = {
    _id: ObjectId('5c6c08d3c54cb002733abec9'),
    updatedAt: '2019-02-19T15:40:56.049Z',
    createdAt: '2019-02-19T13:46:59.674Z',
    token: jwt.sign({ userId: visualizationEditor._id }, process.env.SESSION_SECRET, { expiresIn: '12h' }),
    apiKey: ObjectId('5c614eb33a7ef92d2db3925a'),
    usedAt: null,
    __v: 0,
};

export const expiredToken = {
    _id: ObjectId('5c6c0aec3d390902bb89fdb7'),
    updatedAt: '2019-02-19T15:40:56.049Z',
    createdAt: '2019-02-19T13:46:59.674Z',
    token: jwt.sign({ userId: visualizationEditor._id }, process.env.SESSION_SECRET, { expiresIn: '0' }),
    apiKey: ObjectId('5c614eb33a7ef92d2db3925a'),
    usedAt: null,
    __v: 0,
};

export const teamToken = {
    _id: ObjectId('5c6d1e7c7e540101f2cf2191'),
    updatedAt: '2019-02-19T15:40:56.049Z',
    createdAt: '2019-02-19T13:46:59.674Z',
    token: jwt.sign({ userId: user2._id }, process.env.SESSION_SECRET, { expiresIn: '10h' }),
    apiKey: ObjectId('5c614eb33a7ef92d2db3925a'),
    usedAt: '2019-02-19T15:40:56.048Z',
    __v: 0,
};
