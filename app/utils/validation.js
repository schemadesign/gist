const { mongoose: { Types: { ObjectId } } } = require('../models/mongoose_client');
const { RequestError, ForbiddenError } = require('../libs/system/errors');

module.exports = {
    validateObjectId,
    validateTeamAdmin,
};

/**
 * Throws an error when the id isn't a valid ObjectId.
 * @param {String|ObjectId} id
 * @throws {RequestError}
 */
function validateObjectId(id) {
    if (!id || !ObjectId.isValid(id)) {
        throw new RequestError('Invalid ID');
    }
}

/**
 * Throws an error when the user isn't the admin of the team nor a superuser.
 * @param {Object} user
 * @param {Object} team
 * @throws {RequestError}
 */
function validateTeamAdmin(user, team) {
    const userId = user._id.toString();
    const isSuperUser = user.superUser || user.email.endsWith('+superuser@schemadesign.com');

    if (!isSuperUser && !team.admin.some(id => id.toString() === userId)) {
        throw new ForbiddenError('Not an admin of the team');
    }
}
