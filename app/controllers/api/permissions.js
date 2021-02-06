const winston = require('winston');

const Description = require('../../models/descriptions');
const Team = require('../../models/teams');
const User = require('../../models/users');

const { getDatasetPermissions, getTeamPermissions, assignUserPermissions } = require('./permissions-helpers');

module.exports = {
    getAllUserPermissions,
    setAllDatasetPermissions,
    getAllDatasetPermissions,
    getAllTeamPermissions,
    canCreateInsight,
};

function setAllDatasetPermissions(req, res) {

    Description.findById(req.body.id)
        .populate('_team')
        .exec((err, description) => {
            if (err) {
                winston.error('could not get description to update permissions');
                return res.status(500).json({ error: err.message });
            }

            getDatasetPermissions(description._team, description.vizType, (err, permissions) => {
                if (err) {
                    winston.error('could not setAllDatasetPermissions getDatasetPermissions', err);
                    return res.status(500).json({ error: err.message });
                }

                // Change viz type.
                description.vizType = req.body.vizType;
                description.save();
                res.status(200).json({ permissions });
            });
        });
}

function getAllDatasetPermissions(req, res) {
    Description.findById(req.params.id)
        .populate('_team')
        .lean()
        .exec((err, description) => {
            if (err) {
                winston.error('could not getAllDatasetPermissions');
                return res.status(500).json({ error: err.message });
            }

            if (!description) {
                winston.error('error finding fields: no description found');
                return res.status(404).json({ error: 'Description not found' });
            }

            getDatasetPermissions(description._team, description.vizType, (err, permissions) => {
                if (err) {
                    winston.error('could not getAllDatasetPermissions getDatasetPermissions', err);
                    return res.status(500).json({ error: err.message });
                }

                return res.status(200).json({ permissions });
            });
        });
}

function getAllTeamPermissions(req, res) {
    Team.findById(req.params.id)
        .lean()
        .exec((err, team) => {
            if (err) {
                winston.error('could not find team');
                return res.status(500).json({ error: err.message });
            }

            getTeamPermissions(team, (err, permissions) => {
                if (err) {
                    winston.error('could not getTeamPermissions', err);
                    return res.status(500).json({ error: err.message });
                }

                return res.status(200).json({ permissions });
            });
        });
}

function getAllUserPermissions(req, res) {
    const role = req.params.role;

    User.findById(req.params.id)
        .populate('defaultLoginTeam')
        .lean()
        .exec((err, user) => {
            if (err) {
                winston.error('could not find user');
                return res.status(500).json({ error: err.message });
            }

            assignUserPermissions(user, role, (err, permissions) => {
                if (err) {
                    winston.error('could not assignUserPermissions', err);
                    return res.status(500).json({ error: err.message });
                }

                return res.status(200).json({ permissions });
            });
        });
}

function canCreateInsight(user, { _team: { admin }, _id: vizId }) {
    if (!user) {
        return false;
    }

    const { _id: userId, _editors, _viewers } = user;
    const isAdmin = !!admin.find((id) => id.toString() === userId.toString());
    const isEditorOrViewer = !![..._editors, ..._viewers].find((id) => id.toString() === vizId.toString());

    return user.isSuperAdmin() || isAdmin || isEditorOrViewer;
}
