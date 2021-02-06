const path = require('path');
const fs = require('fs');
const _ = require('lodash');

const users = require('./users/users');

/**
 * Cache for all access control lists,
 * including the standard app ACL and each custom team ACL
 */
const accessControlLists = {};

/**
 * Get the cached ACL or load it from file
 */
const getACL = (teamSubdomain, callback) => {
    const teamAcl = teamSubdomain || 'app';

    if (accessControlLists[teamAcl]) {
        // Return cached ACL
        return callback(null, accessControlLists[teamAcl]);
    }

    let aclPath;
    if (teamSubdomain) {
        aclPath = path.join(__dirname, '/../../../user/', teamSubdomain, '/config/acl.json');
    } else {
        aclPath = path.join(__dirname, '/../../../config/acl.json');
    }

    fs.readFile(aclPath, (err, data) => {
        if (err) {
            return callback(err);
        }

        const parsed = JSON.parse(data);

        // Cache this ACL
        accessControlLists[teamAcl] = parsed;
        callback(null, parsed);
    });
};
module.exports.getACL = getACL;

/**
 * Get vizType for dataset.
 * New property as of March 2018 therefore most will be undefined or null.
 * If not undefined or null, return.
 * If team is enterprise, set viz to customViz.
 *
 * @param {object} team - team object.
 * @param {string} vizType - customViz, standardViz or undefined.
 * @return {string} vizType;
 */
const getVizType = (team, vizType) => {
    if (vizType) {
        return vizType;
    }

    if (team && team.isEnterprise === true) {
        return 'customViz';
    }

    return 'standardViz';
};

module.exports.getVizType = getVizType;

/*
 * Get permissions for dataset.
 * If standard viz, set standard viz permissions
 * If customViz, try setting customViz permissions from user folder. If that doesn't work, fallback to standard.
 *
 * @param {object} team - team object.
 * @param {string} vizType - customViz, standardViz or undefined.
 * @getDatasetPermissionsCallback {callback}
 */
const getDatasetPermissions = (team, vizType, callback = _.identity) => new Promise((resolve, reject) => {
    const mVizType = getVizType(team, vizType);

    const getStandardACL = () => {
        getACL(null, (err, acl) => {
            if (err) {
                callback(err);
                reject(err);
            } else {
                callback(null, acl.standardViz);
                resolve(acl.standardViz);
            }
        });
    };
    /**
     * There are a few things happening here:
     * First try to fetch custom team ACL, else fetch and return core acl.standardViz
     * If viz is standard and team ACL has standardViz permissions, return those
     * If viz is custom and team ACL has customViz permissions, return those
     * If none of the above, return core acl.standardViz
     */
    getACL(team.subdomain, (err, acl) => {
        if (err || !acl) {
            return getStandardACL();
        }

        if (mVizType === 'standardViz' && acl.standardViz) {
            callback(null, acl.standardViz);
            return resolve(acl.standardViz);
        }

        if (mVizType === 'customViz' && acl.customViz) {
            callback(null, acl.customViz);
            return resolve(acl.customViz);
        }

        getStandardACL();
    });
});
module.exports.getDatasetPermissions = getDatasetPermissions;

/**
 * get permissions for team
 * @param {object} team
 * @param {Function} callback (error, permission)
 * @return {array} permissions
 */
const getTeamPermissions = (team, callback) => {
    // Try to fetch custom team ACL, otherwise fetch standard app ACL
    getACL(team.subdomain, (err, permissions) => {
        if (!err) {
            return callback(null, permissions.team);
        }

        getACL(null, (err, permissions) => {
            if (err) {
                return callback(err);
            }

            callback(null, permissions.team);
        });
    });
};
module.exports.getTeamPermissions = getTeamPermissions;

/**
 * a function for creating user permissions based on role and editor status
 * @param {object} user
 * @param {string} role
 * @param {Function} callback
 */
const assignUserPermissions = (user, role, callback) => {
    const team = user.defaultLoginTeam;

    const getUserPermissionByRole = (role, acl) => {
        const isArticleEditor = users.checkIfUserIsEditor(team.pages, [], user._articleEditors, []);
        const isSiteEditor = users.checkIfUserIsEditor(team.sites, [], user._siteEditors, []);
        let permissions;

        if (role !== 'admin' && role !== 'superAdmin') {
            role = `viz${_.upperFirst(role)}`;
        }

        permissions = acl[role];

        if (isArticleEditor) {
            permissions = permissions.concat(acl.articleEditor);
        }

        if (isSiteEditor) {
            permissions = permissions.concat(acl.siteEditor);
        }

        return permissions;
    };

    // Try to fetch custom team ACL, otherwise fetch standard app ACL
    getACL(team.subdomain, (err, permissions) => {
        if (!err) {
            return callback(null, getUserPermissionByRole(role, permissions));
        }

        getACL(null, (err, permissions) => {
            if (err) {
                return callback(err);
            }

            callback(null, getUserPermissionByRole(role, permissions));
        });
    });
};
module.exports.assignUserPermissions = assignUserPermissions;
