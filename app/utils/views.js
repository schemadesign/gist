const { isUndefined, map } = require('lodash');

const Views = require('../models/views');
const { getUser } = require('./users');
const { setDefaultsIfNoneExist } = require('../controllers/api/dataset/mandatory-settings-helpers');
const { mandatorySettings } = require('../../config/mandatory-settings');
const { UserError } = require('../libs/system/errors');

module.exports = {
    getAllViews,
    getAllViewsSettings,
    getView,
    prepareView,
    scaffoldView,
};

/**
 * @param {String|ObjectId} userId
 * @returns {Promise<Object>}
 */
async function getAllViews(userId) {
    const user = await getUser(userId);

    return await Views
        .find({
            $or: [
                { _team: { $exists: false } },
                { _team: user.defaultLoginTeam },
            ],
        })
        .select('_id name displayAs icon _team thumbnail scaffold')
        .lean()
        .exec();
}

/**
 * @param {String|ObjectId} userId
 * @returns {Promise<Object>}
 */
async function getAllViewsSettings(userId) {
    const user = await getUser(userId);

    return await Views
        .find({
            $or: [
                { _team: { $exists: false } },
                { _team: user.defaultLoginTeam },
            ],
        })
        .select('_id name displayAs settings')
        .lean()
        .exec();
}

/**
 * @param {String|ObjectId} id
 * @returns {Promise<Object>}
 */
async function getView(id) {
    return await Views
        .findById(id)
        .lean()
        .exec();
}

/**
 * @param {Object} view
 * @returns {Object}
 */
function prepareView(view) {
    const { settings = [], scaffold = {} } = view;

    settings.forEach(({ inputType, selectExcludeBy }) => {
        if (['menu', 'checkbox'].includes(inputType) && selectExcludeBy && isUndefined(scaffold[selectExcludeBy])) {
            scaffold[selectExcludeBy] = [];
        }
    });

    return Object.assign({}, view, { settings, scaffold });
}

/**
 * @param {Object} view
 * @param {Object<Object>} raw_rowObjects_coercionScheme
 * @param {Array<String>} fe_fieldDisplayOrder
 * @param {Object<Boolean>} fe_excludeFields
 * @returns {Object}
 * @throws {Error}
 */
function scaffoldView(view, { raw_rowObjects_coercionScheme, fe_fieldDisplayOrder, fe_excludeFields }) {
    const columns = map(raw_rowObjects_coercionScheme, ({ sample }, name) => ({ name, sample }));
    const { message, ...scaffold } = setDefaultsIfNoneExist(
        columns,
        raw_rowObjects_coercionScheme,
        fe_fieldDisplayOrder,
        mandatorySettings[view.name],
        fe_excludeFields,
        { ...view.scaffold, visible: true },
        view.name,
    );

    if (message) {
        throw new UserError(message);
    }

    return { ...view, scaffold };
}
