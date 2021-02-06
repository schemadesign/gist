const { isArray, isString, isEmpty, chain } = require('lodash');
const crypto = require('crypto');

const { UserError } = require('../../../libs/system/errors');
const { handleError } = require('../../../utils/requests');
const ApiKey = require('../../../models/api_keys');
const User = require('../../../models/users');
const { userRoles } = require('../../client/config');
const { extractHostname } = require('../../../../shared/url');

async function createUser(team) {
    const salt = crypto.randomBytes(16).toString('hex');
    const password = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    const email = `${team.subdomain}@apiKey`;

    const user = {
        email,
        activated: true,
        _team: [team._id],
        defaultLoginTeam: team._id,
        hash,
        salt,
        canCreateNewViz: [],
        role: userRoles.visualizationEditor,
    };

    return await User
        .create(user);
}

async function getUser(userId) {
    return await User.findById(userId).populate('defaultLoginTeam');
}

async function getApiKey(teamId) {
    return await ApiKey
        .findOne({ team: teamId })
        .lean()
        .select('_id')
        .exec();
}

const generateKey = (user, team) => {
    const base = team._id + team.createdAt;
    return crypto.pbkdf2Sync(base, user.salt, 1000, 15, 'sha512').toString('hex');
};

module.exports.generate = async function (req, res) {
    try {
        const user = await getUser(req.user);
        const team = user.defaultLoginTeam;
        const host = req.get('host');

        if (!user.isAdmin(team) && !user.isSuperAdmin()) {
            return handleError(new UserError('Only team admin can generate API key.'), res);
        }

        const previousApiKey = await getApiKey(team._id);

        if (previousApiKey) {
            return handleError(new UserError('API key is already generated.'), res);
        }

        const newUser = await createUser(team);

        const item = {
            key: generateKey(user, team),
            user: newUser._id,
            createdBy: user._id,
            team: team._id,
            requestDomains: [extractHostname(host)],
        };

        const { key, active, requestDomains } = await ApiKey.create(item);

        res.status(200).json({ key, active, requestDomains });
    } catch (err) {
        handleError(err, res);
    }
};

module.exports.getKey = async function (req, res) {
    const user = await getUser(req.user);
    if (!user.isAdmin(user.defaultLoginTeam) && !user.isSuperAdmin()) {
        return handleError(new UserError('Only team admin can get the API key.'), res);
    }

    ApiKey.findOne({ team: user.defaultLoginTeam }, (err, apiKey) => {
        if (err) {
            return handleError(err, res);
        }

        const item = {
            key: null,
            active: false,
        };

        if (apiKey) {
            item.key = apiKey.key;
            item.active = apiKey.active;
            item.requestDomains = apiKey.requestDomains;
        }

        res.status(200).json(item);
    });

};

module.exports.update = async function (req, res) {
    const { apiKey, domains } = req.body;
    if (!isArray(domains)) {
        return res.status(400).json({ error: 'Domains must be an array.' });
    }

    const isOnlyString = domains.every(domain => isString(domain));

    if (!isOnlyString) {
        return res.status(400).json({ error: 'Only strings allowed as domains.' });
    }

    const filteredDomains = chain(domains).map(extractHostname).filter(item => !isEmpty(item)).uniq().value();

    if (!apiKey) {
        return res.status(400).json({ error: 'Not enough parameters' });
    }

    if (!filteredDomains.length) {
        return res.status(400).json({ error: 'You need at least one domain.' });
    }

    try {
        const user = await getUser(req.user);

        const apiKeyModel = await ApiKey.findOne({ key: apiKey }).populate('team');


        if (!user.isAdmin(apiKeyModel.team)) {
            return res.status(400).json({ error: 'You don\'t have permissions to perform this action.' });
        }

        apiKeyModel.requestDomains = filteredDomains;

        await apiKeyModel.save();

        return res.status(200).json({ requestDomains: filteredDomains });
    } catch (err) {
        handleError(err, res);
    }
};
