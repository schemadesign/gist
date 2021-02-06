import request from 'supertest';
import app from '../../../../app';
import { hydrateDb, getId, loginAndGetSessionCookie } from '../../../../internals/testing/backend/utils';
import {
    user1,
    user2,
    editorUser,
    viewerUser,
    superUser,
    hackyUser,
    articleEditorUser,
    articleViewerUser,
    jsonEditorUser,
} from '../../../../internals/testing/backend/fixtures/users';
import { team1 } from '../../../../internals/testing/backend/fixtures/teams';
import {
    simpsons,
    teamViz,
    privateVizWithEditor,
    apiDataset,
} from '../../../../internals/testing/backend/fixtures/datasets';
import { homepage, page1, article1 } from '../../../../internals/testing/backend/fixtures/pages';
import Team from '../../../models/teams';

import { getTeamBySubdomain } from '../team';


const promisified_getTeamBySubdomain = (req, callback) => new Promise(resolve => {
    getTeamBySubdomain(req, (...args) => {
        callback(...args);
        resolve();
    });
});

describe('Team controller', () => {
    let appRequest;

    beforeEach(async () => {
        await hydrateDb();
        appRequest = request(app);
    });

    describe('getTeamBySubdomain', () => {
        it('should return all listed visualizations for superadmin', async () => {
            const callback = jest.fn();
            const req = {
                user: getId(superUser),
                subdomains: ['user'],
                query: {},
            };

            await promisified_getTeamBySubdomain(req, callback);

            expect(callback.mock.calls[0][1][0].datasourceDescriptions.map(description => description._id)).toEqual([
                apiDataset._id,
                privateVizWithEditor._id,
                teamViz._id,
                simpsons._id,
            ]);
        });

        it('should return only public visualizations for non-team member', async () => {
            const callback = jest.fn();
            const req = {
                user: getId(hackyUser),
                subdomains: ['user'],
                query: {},
            };

            await promisified_getTeamBySubdomain(req, callback);

            expect(callback.mock.calls[0][1][0].datasourceDescriptions.map(description => description._id)).toEqual([
                apiDataset._id,
                simpsons._id,
            ]);
        });

        it('should return only public visualizations for unauthorized user', async () => {
            const callback = jest.fn();
            const req = {
                user: null,
                subdomains: ['user'],
                query: {},
            };

            await promisified_getTeamBySubdomain(req, callback);

            expect(callback.mock.calls[0][1][0].datasourceDescriptions.map(description => description._id)).toEqual([
                apiDataset._id,
                simpsons._id,
            ]);
        });

        it('should return all listed visualizations for team admin', async () => {
            const callback = jest.fn();
            const req = {
                user: getId(user2),
                subdomains: ['user'],
                query: {},
            };

            await promisified_getTeamBySubdomain(req, callback);

            expect(callback.mock.calls[0][1][0].datasourceDescriptions.map(description => description._id)).toEqual([
                apiDataset._id,
                privateVizWithEditor._id,
                teamViz._id,
                simpsons._id,
            ]);
        });

        it('should return visualizations that user is editor of and public ones for non-admin team member', async () => {
            const callback = jest.fn();
            const req = {
                user: getId(editorUser),
                subdomains: ['user'],
                query: {},
            };

            await promisified_getTeamBySubdomain(req, callback);

            expect(callback.mock.calls[0][1][0].datasourceDescriptions.map(description => description._id)).toEqual([
                apiDataset._id,
                privateVizWithEditor._id,
                simpsons._id,
            ]);
        });

        it('should return visualizations that user is viewer of and public ones for non-admin team member', async () => {
            const callback = jest.fn();
            const req = {
                user: getId(viewerUser),
                subdomains: ['user'],
                query: {},
            };

            await promisified_getTeamBySubdomain(req, callback);

            expect(callback.mock.calls[0][1][0].datasourceDescriptions.map(description => description._id)).toEqual([
                apiDataset._id,
                privateVizWithEditor._id,
                simpsons._id,
            ]);
        });

        it('should return pages with "displayOnTeamPage" flag for team admin', async () => {
            const callback = jest.fn();
            const req = {
                user: getId(user1),
                subdomains: ['glitter'],
                query: {},
            };

            await promisified_getTeamBySubdomain(req, callback);

            expect(callback.mock.calls[0][1][0].pages.map(page => page._id)).toEqual([
                homepage._id,
                article1._id,
                page1._id,
            ]);
        });

        it('should return pages with "displayOnTeamPage" flag for super admin', async () => {
            const callback = jest.fn();
            const req = {
                user: getId(superUser),
                subdomains: ['glitter'],
                query: {},
            };

            await promisified_getTeamBySubdomain(req, callback);

            expect(callback.mock.calls[0][1][0].pages.map(page => page._id)).toEqual([
                homepage._id,
                article1._id,
                page1._id,
            ]);
        });

        it('should return public ("published" flag) pages for non-team member', async () => {
            const callback = jest.fn();
            const req = {
                user: getId(hackyUser),
                subdomains: ['glitter'],
                query: {},
            };

            await promisified_getTeamBySubdomain(req, callback);

            expect(callback.mock.calls[0][1][0].pages.map(page => page._id)).toEqual([
                homepage._id,
            ]);
        });

        it('should return public ("published" flag) pages for unauthorized user', async () => {
            const callback = jest.fn();
            const req = {
                user: null,
                subdomains: ['glitter'],
                query: {},
            };

            await promisified_getTeamBySubdomain(req, callback);

            expect(callback.mock.calls[0][1][0].pages.map(page => page._id)).toEqual([
                homepage._id,
            ]);
        });

        it('should return pages that user is editor of and public ones for non-admin team member', async () => {
            const callback = jest.fn();
            const req = {
                user: getId(articleEditorUser),
                subdomains: ['glitter'],
                query: {},
            };

            await promisified_getTeamBySubdomain(req, callback);

            expect(callback.mock.calls[0][1][0].pages.map(page => page._id)).toEqual([
                homepage._id,
                article1._id,
            ]);
        });

        it('should return pages that user is viewer of and public ones for non-admin team member', async () => {
            const callback = jest.fn();
            const req = {
                user: getId(articleViewerUser),
                subdomains: ['glitter'],
                query: {},
            };

            await promisified_getTeamBySubdomain(req, callback);

            expect(callback.mock.calls[0][1][0].pages.map(page => page._id)).toEqual([
                homepage._id,
                article1._id,
            ]);
        });
    });

    describe('addAdmin', () => {
        it('should not allow to perform action when not an admin', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, jsonEditorUser);
            const response = await appRequest
                .put(`/api/team/admin/${jsonEditorUser._id}`)
                .set('Cookie', sessionCookie);

            expect(response).toMatchSnapshot();
        });

        it('should not allow to perform action when user doesn\'t belong to the team', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, user1);
            const response = await appRequest
                .put(`/api/team/admin/${user2._id}`)
                .set('Cookie', sessionCookie);

            expect(response).toMatchSnapshot();
        });

        it('should not allow to perform action when user is already an admin', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, user1);
            const response = await appRequest
                .put(`/api/team/admin/${user1._id}`)
                .set('Cookie', sessionCookie);

            expect(response).toMatchSnapshot();
        });

        it('should add admin', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, user1);
            const response = await appRequest
                .put(`/api/team/admin/${jsonEditorUser._id}`)
                .set('Cookie', sessionCookie);

            expect(response).toMatchSnapshot();

            const team = await Team.findById(team1._id);
            expect(team.admin).toEqual(expect.arrayContaining([jsonEditorUser._id]));
        });
    });

    describe('deleteAdmin', () => {
        it('should not allow to perform action when not an admin', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, jsonEditorUser);
            const response = await appRequest
                .delete(`/api/team/admin/${jsonEditorUser._id}`)
                .set('Cookie', sessionCookie);

            expect(response).toMatchSnapshot();
        });

        it('should not allow to perform action when user doesn\'t belong to the team', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, user1);
            const response = await appRequest
                .delete(`/api/team/admin/${user2._id}`)
                .set('Cookie', sessionCookie);

            expect(response).toMatchSnapshot();
        });

        it('should not allow to perform action when selected user is not an admin', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, user1);
            const response = await appRequest
                .delete(`/api/team/admin/${jsonEditorUser._id}`)
                .set('Cookie', sessionCookie);

            expect(response).toMatchSnapshot();
        });

        it('should not allow to perform action when only one admin is in the team', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, user1);
            const response = await appRequest
                .delete(`/api/team/admin/${user1._id}`)
                .set('Cookie', sessionCookie);

            expect(response).toMatchSnapshot();
        });

        it('should remove admin', async () => {
            await Team.findOneAndUpdate({ _id: team1._id }, { admin: [user1._id, jsonEditorUser._id] });

            const sessionCookie = await loginAndGetSessionCookie(appRequest, user1);
            const response = await appRequest
                .delete(`/api/team/admin/${jsonEditorUser._id}`)
                .set('Cookie', sessionCookie);

            expect(response).toMatchSnapshot();

            const team = await Team.findById(team1._id);
            expect(team.admin).not.toEqual(expect.arrayContaining([jsonEditorUser._id]));
        });
    });
});
