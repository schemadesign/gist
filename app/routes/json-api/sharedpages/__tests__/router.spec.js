import request from 'supertest';

import { hydrateDb, loginAndGetSessionCookie, getId } from '../../../../../internals/testing/backend/utils';
import { user1 } from '../../../../../internals/testing/backend/fixtures/users';
import app from '../../../../../app';
import SharedPage from '../../../../models/shared_pages';
import { queue } from '../../../../boot/queue-init';


describe('Sharing API', () => {
    let appRequest;

    beforeEach(async () => {
        await hydrateDb();
        appRequest = request(app);
    });

    describe('post /share', () => {
        it('should insert new shared page', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, user1);
            const response = await appRequest
                .post('/json-api/v1/share')
                .send({ url: 'http://glitter.local.arrays.co/newviztest/gallery' })
                .set('Cookie', sessionCookie)
                .set('Host', `glitter.${process.env.HOST}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('share_id', expect.any(String));
            expect(response.body).toHaveProperty('share_url', `http://glitter.local.arrays.co/s/${response.body.share_id}`);
        });

        it('should properly detect pageType, viewType and query', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, user1);
            const response = await appRequest
                .post('/json-api/v1/share')
                .send({ url: 'http://glitter.local.arrays.co/newviztest/gallery?sortBy=name' })
                .set('Cookie', sessionCookie)
                .set('Host', `glitter.${process.env.HOST}`);
            const sharedPage = await SharedPage.findById(response.body.share_id);

            expect(response.status).toBe(200);
            expect(sharedPage).toMatchObject({
                pageType: 'array_view',
                viewType: 'gallery',
                query: {
                    sortBy: 'name',
                },
            });
        });

        it('should return previous shared page', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, user1);
            const response = await appRequest
                .post('/json-api/v1/share')
                .send({ url: 'http://glitter.local.arrays.co/s/5af05bbf497f90062e8caeba' })
                .set('Cookie', sessionCookie)
                .set('Host', `glitter.${process.env.HOST}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('share_id', '5af05bbf497f90062e8caeba');
            expect(response.body).toHaveProperty('share_url', 'http://glitter.local.arrays.co/s/5af05bbf497f90062e8caeba');
        });

        it('should return 500 for non-existing shared page', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, user1);
            const response = await appRequest
                .post('/json-api/v1/share')
                .send({ url: 'http://glitter.local.arrays.co/s/5a4ed5572a1cf29b85201bb3' })
                .set('Cookie', sessionCookie)
                .set('Host', `glitter.${process.env.HOST}`);

            expect(response.status).toBe(500);
        });
    });

    describe('post /story', () => {
        it('should create a job and return its id', async () => {
            const data = {
                title: 'Lorem',
                caption: 'Ipsum',
                sharedPages: [{ url: 'http://glitter.local.arrays.co/newviztest/gallery?sortBy=name' }],
            };
            const sessionCookie = await loginAndGetSessionCookie(appRequest, user1);
            const response = await appRequest
                .post('/json-api/v1/story')
                .send(data)
                .set('Cookie', sessionCookie)
                .set('Host', `glitter.${process.env.HOST}`);

            expect(response.status).toBe(200);
            expect(queue.testMode.jobs).toHaveLength(1);
            expect(queue.testMode.jobs[0].type).toEqual('processStory');
            expect(queue.testMode.jobs[0].data).toEqual({
                ...data,
                user: getId(user1),
            });
            expect(response.body).toEqual({
                jobId: queue.testMode.jobs[0].id,
            });
        });

        it('should respond with 400 when shared pages are not provided', async () => {
            const data = {
                title: 'Lorem',
                caption: 'Ipsum',
                sharedPages: [],
            };
            const sessionCookie = await loginAndGetSessionCookie(appRequest, user1);
            const response = await appRequest
                .post('/json-api/v1/story')
                .send(data)
                .set('Cookie', sessionCookie)
                .set('Host', `glitter.${process.env.HOST}`);

            expect(response.status).toBe(400);
        });
    });
});
