import { find } from 'lodash';

import PermissionsHelpers from './../permissions-helpers';
import Teams from './../../../../tests/config/teams';
import Users from './../../../../tests/config/users';
import Datasets from './../../../../tests/config/datasets';
import acl from './../../../../config/acl.json';


describe('Permissions-Helpers', () => {
    const populateTeam = (user) => {
        const teamId = user.defaultLoginTeam.toString();

        user.defaultLoginTeam = find(Teams, team => team._id.toString() === teamId);

        return user;
    };

    describe('getDatasetPermissions', () => {
        it('should get all dataset permissions', done => {
            PermissionsHelpers.getDatasetPermissions(Datasets.pokemon1._team, Datasets.pokemon1.vizType, (err, permissions) => {
                expect(permissions).toEqual(expect.arrayContaining(acl.standardViz));
                done();
            });
        });

        it('should return standardViz permissions', done => {
            PermissionsHelpers.getDatasetPermissions(Teams.team1, 'standardViz', (err, permissions) => {
                expect(permissions).toEqual(expect.arrayContaining(acl.standardViz));
                done();
            });
        });
    });

    describe('assignUserPermissions', () => {
        it('should get all user permissions for superAdmin', done => {
            const user = populateTeam(Users.user1);

            PermissionsHelpers.assignUserPermissions(user, 'superAdmin', (err, permissions) => {
                expect(permissions).toEqual(expect.arrayContaining(acl.superAdmin));
                done();
            });
        });

        it('should get all user permissions for admin user', done => {
            const user = populateTeam(Users.user2);

            PermissionsHelpers.assignUserPermissions(user, 'admin', (err, permissions) => {
                expect(permissions).toEqual(expect.arrayContaining(acl.admin));
                done();
            });
        });

        it('should get all user permissions for viz editor user', done => {

            const user = populateTeam(Users.editorUser);
            PermissionsHelpers.assignUserPermissions(user, 'editor', (err, permissions) => {
                expect(permissions).toEqual(expect.arrayContaining(acl.vizEditor));
                done();
            });
        });

        it('should get all user permissions for article editor user', done => {
            const user = populateTeam(Users.articleEditorUser);

            PermissionsHelpers.assignUserPermissions(user, 'viewer', (err, permissions) => {
                expect(permissions).toEqual(expect.arrayContaining(acl.articleEditor));
                done();
            });
        });

        it('should get all user permissions for site editor user', done => {
            const user = populateTeam(Users.siteEditorUser);

            PermissionsHelpers.assignUserPermissions(user, 'viewer', (err, permissions) => {
                expect(permissions).toEqual(expect.arrayContaining(acl.siteEditor));
                done();
            });
        });
    });

    describe('getAllTeamPermissions', () => {
        it('should get all team permissions', done => {
            PermissionsHelpers.getTeamPermissions(Teams.team1, (err, permissions) => {
                expect(permissions).toEqual(expect.arrayContaining(acl.team));
                done();
            });
        });
    });
});
