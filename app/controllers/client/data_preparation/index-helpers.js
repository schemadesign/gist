const datasource_description = require('../../../models/descriptions');
var User = require('../../../models/users');

// Customize the model
const getDescriptionsAndPopulateTeam = (teamQuery, datasetQuery, callback) => {
    datasource_description.find(datasetQuery)
        .populate({
            path: '_team',
            match: teamQuery,
            select: 'subdomain admin _id title isEnterprise'
        })
        .sort({ createdAt: 'desc' })
        .exec((err, datasets) => {
            callback(err, datasets);
        });
};

const _GetAllDescriptions = (req, callback) => {
    const userId = req.user;

    const nonLoginUserQuery = (cb) => {
        const publicAndImportedDataset = { isPublic: true, imported: true, fe_listed: true, fe_visible: true, state: 'approved' };
        const publicAndConnectedDataset = { isPublic: true, connection: { $ne: null }, fe_listed: true, fe_visible: true };
        const currentDataset = { $or: [{ replaced: false }, { replaced: { $exists: false } }] };

        if (req.query.vizName) {
            publicAndImportedDataset.title = req.query.vizName;
        }

        if (req.query.teamName) {
            getDescriptionsAndPopulateTeam({ title: req.query.teamName },
                { $and: [{ $or: [publicAndImportedDataset, publicAndConnectedDataset] }, currentDataset] }, cb);
        } else {
            getDescriptionsAndPopulateTeam({ $and: [{ $or: [publicAndImportedDataset, publicAndConnectedDataset] }, currentDataset] }, cb);
        }
    };

    if (userId) {
        User.findById(userId)
            .populate('_team')
            .populate('defaultLoginTeam')
            .exec((err, foundUser) => {
                if (err) {
                    return callback(err);
                }
                if (!foundUser) {
                    return nonLoginUserQuery(callback);
                }
                const importedDataset = { imported: true, fe_visible: true, state: 'approved' };

                if (req.query.vizName) {
                    importedDataset.title = req.query.vizName;
                }

                const connectedDataset = { connection: { $ne: null }, fe_listed: true, fe_visible: true };
                if (process.env.NODE_ENV === 'enterprise') {
                    delete importedDataset.state;
                }

                const myTeamId = foundUser.defaultLoginTeam._id;
                const otherTeams = { _team: { $ne: myTeamId }, isPublic: true };
                const myTeam = { _team: foundUser.defaultLoginTeam._id };

                if (foundUser.isSuperAdmin()) {
                    // get descriptions and populate dataset with query/teams
                    getDescriptionsAndPopulateTeam({}, { $or: [importedDataset, connectedDataset] }, callback);
                } else if (foundUser.defaultLoginTeam.admin.some(id => id.toString() === userId)) {
                    // get descriptions and populate dataset with query/teams
                    getDescriptionsAndPopulateTeam(
                        {
                            $and: [
                                { $or: [myTeam, otherTeams] },
                                { $or: [importedDataset, connectedDataset] }
                            ]
                        },
                        callback
                    );
                } else {
                    myTeam['$or'] = [{ _id: { $in: foundUser._editors } }, { _id: { $in: foundUser._viewers } }];
                    // get descriptions populate
                    getDescriptionsAndPopulateTeam(
                        {
                            $and: [
                                { $or: [myTeam, otherTeams] },
                                { $or: [importedDataset, connectedDataset] }
                            ]
                        },
                        callback
                    );
                }
            });
    } else {
        nonLoginUserQuery(callback);
    }
};
module.exports.GetAllDescriptions = _GetAllDescriptions;
