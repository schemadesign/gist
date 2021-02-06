import { ObjectId } from 'mongodb';
import fs from 'fs';
import path from 'path';

import Story from '../../../models/stories';
import SharedPage from '../../../models/shared_pages';
import { hydrateDb } from '../../../../internals/testing/backend/utils';


describe('processStory task', () => {
    let processStory;

    const job = {
        data: {
            title: 'Lorem',
            caption: 'Ipsum',
            sharedPages: [
                {
                    url: 'http://glitter.local.arrays.co:9080/pokemon/5b05346ad7a86407e5ef783d',
                    renderingOptions: {
                        viewportSize: { width: 1, height: 1 },
                    },
                },
                {
                    url: 'http://glitter.local.arrays.co:9080/pokemon/gallery',
                    renderingOptions: {
                        viewportSize: { width: 1, height: 1 },
                    },
                },
            ],
            user: '5a42bf07d3bc0b20648290e0',
        },
    };

    beforeAll(() => {
        jest.mock('../puppeteer-helpers', () => ({
            newPage: jest.fn().mockImplementation(async (browser) => {
                const page = await browser.newPage();

                await page.setRequestInterception(true);

                page.on('request', (request) => {
                    return request.respond({
                        status: 200,
                        contentType: 'text/html',
                        body: `
                            <html>
                                <body>
                                    <div class="gist-content" style="width: 1px; height: 1px; background: white;"></div>
                                    <script type="text/javascript">
                                        window.callPhantom && window.callPhantom('takeScreenshot');
                                    </script>
                                </body>
                            </html>
                        `,
                    });
                });

                return page;
            }),
        }));

        processStory = require('../process-story');
    });

    beforeEach(async () => {
        await hydrateDb();
    });

    it('should call callback with null', async () => {
        const callback = jest.fn();

        await processStory(job, callback);

        expect(callback).toHaveBeenCalledWith(null, expect.any(String));
    });

    it('should make screenshots', async () => {
        const { sharedPages } = await processStory(job, jest.fn());

        sharedPages.forEach((sharedPageId) => {
            const screenshotPath = path.resolve(__dirname, `../../../../__mocks__/tmp/buckets/arraystesting/glitter/5a42c26e303770207ce8f83b/shared-pages/${sharedPageId}.png`);

            expect(fs.existsSync(screenshotPath)).toBe(true);
            expect(fs.readFileSync(screenshotPath).toString('base64'))
                .toBe('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQYlWP4DwQACfsD/Vef1tkAAAAASUVORK5CYII=');
        });
    });

    it('should save story in db', async () => {
        const story = await processStory(job, jest.fn());

        expect(await Story.findById(story._id)).not.toBeNull();
    });

    it('should save shared pages in db', async () => {
        const { sharedPages } = await processStory(job, jest.fn());

        await Promise.all(sharedPages.map(async (sharedPageId) => {
            const sharedPage = await SharedPage.findById(sharedPageId);

            expect(sharedPage).not.toBeNull();
            expect(sharedPage.dataset).toEqual(ObjectId('5a42c26e303770207ce8f83b'));
        }));
    });
});
