const Users = require('../models/users');

module.exports = {
    getUser,
};

/**
 * @param {String|ObjectId} id
 * @returns {Promise<Object>}
 */
async function getUser(id) {
    return await Users
        .findById(id)
        .lean()
        .exec();
}
