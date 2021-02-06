import request from 'supertest';

import app from '../../../app';
import Page from '../../models/pages';
import Team from '../../models/teams';
import User from '../../models/users';
import { hydrateDb, getId } from '../../../internals/testing/backend/utils';
import { user2, editorUser } from '../../../internals/testing/backend/fixtures/users';
import { team2 } from '../../../internals/testing/backend/fixtures/teams';
import { homepage } from '../../../internals/testing/backend/fixtures/pages';
import { site1, newSite } from '../../../internals/testing/backend/fixtures/sites';

const team2Id = getId(team2);
const user2Id = getId(user2);

describe('Websites API', () => {
    let appRequest;

    beforeEach(async () => {
        await hydrateDb();
        appRequest = request(app);
    });

    describe('create', () => {

        it('should create a website and populate team with created site', async () => {
            const requestBody = {
                _id: '5ac26b456f8073766713bcef',
                team: team2Id,
                createdBy: user2Id,
                slug: 'test',
                title: 'test'
            };
            const response = await appRequest.post('/api/website').send(requestBody);

            expect(response.statusCode).toBe(200);
            expect(response.body.team.sites).toContain(response.body._id);
            expect(response.body.published).toBe(false);


            expect(response).toMatchSnapshot();
        });
    });

    describe('copy', () => {
        it('should copy a website', async () => {
            const requestBody = {
                makeCopy: true,
                copyOf: site1._id
            };
            const response = await appRequest.post('/api/website').send(requestBody);
            const suffix = 'copy';

            expect(response.statusCode).toBe(200);
            expect(response.body.pages).toHaveLength(3);
            expect(response.body.homepage.pageTitle).toBe(`${homepage.pageTitle} ${suffix}`);
            expect(response.body.title).toBe(`${site1.title} ${suffix}`);
            expect(response.body.slug).toBe(`${site1.slug}-${suffix}`);

            response.body.homepage.website = 'dummy';
            response.body.pages = [];

            await Team.findById(site1.team).then(team => {
                expect(team.sites).toContain(response.body._id);
            });

            expect(response).toMatchSnapshot();
        });
    });

    describe('delete', () => {
        it('should delete a site', async () => {
            const response = await appRequest.delete(`/api/website/${newSite._id}`).send();
            expect(response.statusCode).toBe(200);

            expect((await Team.findById(newSite.team)).sites).not.toContain(newSite._id);
            expect((await User.findById(user2._id))._siteViewers).not.toContain(newSite._id);
            expect((await User.findById(editorUser._id))._siteEditors).not.toContain(newSite._id);
            expect((await Page.find({ website: newSite._id }))).toHaveLength(0);

            expect(response).toMatchSnapshot();
        });


    });
});
