import request from 'supertest';

import app from '../../../app';
import Website from '../../models/websites';
import Page from '../../models/pages';
import Team from '../../models/teams';
import User from '../../models/users';
import { hydrateDb, getId, insert, loginAndGetSessionCookie } from '../../../internals/testing/backend/utils';
import { user2 } from '../../../internals/testing/backend/fixtures/users';
import { team2 } from '../../../internals/testing/backend/fixtures/teams';
import { article1 } from '../../../internals/testing/backend/fixtures/pages';

const team2Id = getId(team2);
const user2Id = getId(user2);
const websiteData = {
    createdBy: user2Id,
    title: 'Some title',
    slug: team2.subdomain,
    team: team2Id,
    published: true,
    pages: [],
};
const pageData = {
    createdBy: user2Id,
    team: team2Id,
    slug: 'first-article',
    pageTitle: 'First Article'
};

describe('Articles API', () => {
    let appRequest;

    beforeEach(async () => {
        await hydrateDb();
        appRequest = request(app);
    });

    it('should automatically create a website if none exists', async () => {
        const url = `/api/website/search/${team2Id}/${team2.subdomain}`;
        const sessionCookie = await loginAndGetSessionCookie(appRequest, user2);
        const response = await appRequest
            .get(url)
            .set('Cookie', sessionCookie);

        expect(response).toMatchSnapshot();
    });

    it('should retrieve a website if already created', async () => {
        const website = await insert(Website, websiteData);

        const url = `/api/website/search/${team2Id}/${team2.subdomain}`;
        const sessionCookie = await loginAndGetSessionCookie(appRequest, user2);
        const response = await appRequest
            .get(url)
            .set('Cookie', sessionCookie);

        expect(response.body._id).toBe(getId(website));
        expect(response).toMatchSnapshot();
    });

    it('should create a new article (page) with the website that was previously created', async () => {
        const website = await insert(Website, websiteData);
        const requestBody = { ...pageData, website };
        const response = await appRequest.post('/api/page').send(requestBody);

        expect(response.statusCode).toBe(200);
        expect(response.body.website.pages).toContain(response.body._id);
        expect(response.body.team._id).toEqual(team2Id);

        delete response.body.team.pages;
        delete response.body.website.pages;
        response.body.createdBy._articleEditors = [];
        expect(response).toMatchSnapshot();
    });

    it('should return 500 when no website in req.body when creating a new article', async () => {
        const response = await appRequest.post('/api/page').send(pageData);

        expect(response).toMatchSnapshot();
    });

    it('should update published prop', async () => {
        const website = await insert(Website, websiteData);
        const page = await insert(Page, { ...pageData, website });
        const requestBody = { published: true };
        const response = await appRequest.put(`/api/page/${getId(page)}`).send(requestBody);

        expect(response.body.website).toBe(getId(website));

        delete response.body.website;
        expect(response).toMatchSnapshot();
    });

    it('should escape parsedBody if sent without rawBody', async () => {
        const website = await insert(Website, websiteData);
        const page = await insert(Page, { ...pageData, website });
        const requestBody = { parsedBody: "<script>alert('xss')</script>" };
        const response = await appRequest.put(`/api/page/${getId(page)}`).send(requestBody);
        delete response.body.website;

        expect(response).toMatchSnapshot();
    });

    it('should update markdown and update updatedAt field', async () => {
        const website = await insert(Website, websiteData);
        const page = await insert(Page, { ...pageData, website });
        const requestBody = {
            parsedBody: '<p>This is some content</p>\n',
            rawBody: 'This is a test\n- unordered list item 1\n1. ordered list item 1\n**strong text**\n_emphasized text_\n### heading text\n\n```\ncode text here\n```\n> quote here',
        };
        const response = await appRequest.put(`/api/page/${getId(page)}`).send(requestBody);

        expect(new Date(response.body.updatedAt).valueOf()).toBeGreaterThan(page.updatedAt.valueOf());

        delete response.body.website;
        expect(response).toMatchSnapshot();
    });

    it('should make a copy', async () => {
        const website = await insert(Website, websiteData);
        const page = await insert(Page, { ...pageData, website });
        const requestBody = {
            copyOf: getId(page),
            createdBy: user2Id,
            team: team2Id,
            makeCopy: true,
            published: false
        };
        const response = await appRequest.post('/api/page').send(requestBody);

        expect(response.body.website._id).toBe(getId(website));

        const article_copy = response.body;
        // should push that copy to the team pages array
        Team.findById(article_copy.team, (err, team) => {
            expect(team.pages).toContain(article_copy._id);
        });

        Website.findById(article_copy.website, function (err, website) {
            expect(website).not.toBeNull();
            expect(website.pages).toContain(article_copy._id);
        });

        delete response.body.team.pages;
        delete response.body.website.pages;
        expect(response).toMatchSnapshot();
    });

    it('should delete a page', async () => {
        const website = await insert(Website, websiteData);
        const { body: { _id: pageId } } = await appRequest.post('/api/page')
            .send({ ...pageData, website });
        const { body: { _id: pageCopyId } } = await appRequest.post('/api/page')
            .send({
                ...pageData,
                website,
                copyOf: pageId,
                makeCopy: true,
            });

        const response = await appRequest.delete(`/api/page/${pageCopyId}`);
        const article_copy = response.body;

        expect(response.statusCode).toBe(200);
        expect(article_copy._id).toBe(getId(website));
        expect(article_copy.pages).toContain(pageId);
        expect(article_copy.pages).not.toContain(pageCopyId);

        delete response.body.pages;
        expect(response).toMatchSnapshot();
    });

    it('should delete another article', async () => {
        const response = await appRequest.delete(`/api/page/${article1._id}`);
        expect(response.statusCode).toBe(200);

        const article_to_delete_editor_id = '5a0a007a030c6ee6bfbf3333';
        await User.findById(article_to_delete_editor_id, (err, user) => {
            expect(user._articleEditors).not.toContain(article1._id);
        });

        const article_to_delete_viewer_id = '5a0a007a030c6ee6bfbf4444';
        await User.findById(article_to_delete_viewer_id, (err, user) => {
            expect(user._articleViewers).not.toContain(article1._id);
        });

        delete response.body.pages;
        expect(response).toMatchSnapshot();
    });
});
