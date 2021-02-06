const { merge, get, pick } = require('lodash');
const Puppeteer = require('puppeteer');

const s3Image = require('../utils/aws-image-hosting');
const SharedPage = require('../../models/shared_pages');
const { newPage } = require('./puppeteer-helpers');


const prepareRenderingOptions = ({ pageType, viewType, renderingOptions, extra = {} }) => {
    const defaultOptions = {
        viewportSize: {
            width: 1200,
            height: 800,
        },
        fullScreenshotViewportSize: {
            width: 1210,
            height: 700,
        },
        takeShotOnCallback: true,
        waitUntil: 'networkidle0',
    };

    const viewSpecificOptions = {
        array_view: {
            globe: {
                waitUntil: 'load',
            },
            map: {
                renderDelay: 5000
            },
        },
    };

    return merge(
        {},
        defaultOptions,
        get(viewSpecificOptions, [pageType, viewType]),
        pick(renderingOptions, ['viewportSize', 'takeShotOnCallback', 'waitUntil', 'renderDelay']),
        extra
    );
};

const prepareBrowser = async () => {
    const launchOptions = {
        headless: false,
        ignoreHTTPSErrors: true,
        args: ['--no-sandbox', '--headless', '--hide-scrollbars'],
    };

    return await Puppeteer.launch(launchOptions);
};

const takeScreenshot = async (sharedPage, browser) => {
    const page = await newPage(browser);
    const renderOptions = prepareRenderingOptions(sharedPage);
    let viewportSize = renderOptions.viewportSize;

    const extraHeaders = {
        'x-screenshot-token': process.env.SCREENSHOT_SECRET
    };

    if (renderOptions.fullScreenshot) {
       extraHeaders['x-screenshot-full'] = process.env.SCREENSHOT_SECRET;

       viewportSize = renderOptions.fullScreenshotViewportSize;
       viewportSize.height = Math.max(viewportSize.height, parseInt(renderOptions.height, 10));
    }

    await page.setExtraHTTPHeaders(extraHeaders);
    await page.setViewport({ ...viewportSize, deviceScaleFactor: 1 });

    if (renderOptions.customCSS) {
        await page.addStyleTag({ content: renderOptions.customCSS });
    }

    let resolveCallPhantom;
    const callPromise = new Promise((resolve) => (resolveCallPhantom = resolve));

    await page.exposeFunction('callPhantom', resolveCallPhantom);
    await page.goto(sharedPage.url, { waitUntil: renderOptions.waitUntil });

    if (renderOptions.takeShotOnCallback) {
        const timeoutPromise = new Promise((resolve, reject) =>
            setTimeout(() => reject(new Error('Timed out while waiting for window.callPhantom')), 10000));
        await Promise.race([callPromise, timeoutPromise]);
    }

    if (renderOptions.legend === 'hidden') {
       await page.click('.gist-legend-close');
       await page.waitFor(1200);
    }

    if (renderOptions.renderDelay) {
        await page.waitFor(renderOptions.renderDelay);
    }

    const {fullPage} = renderOptions;
    const screenshot = await page.screenshot({
        fullPage
    });

    await page.close();

    return screenshot;
};

const uploadImage = async ({ _id, dataset, subdomain }, image) => {
    const key = `${subdomain}/${dataset}/shared-pages/${_id}.png`;

    return await new Promise((resolve, reject) => {
        s3Image.uploadToS3(key, image, (err, data) => {
            if (err) {
                return reject('Cannot upload screenshot to s3');
            }

            return resolve(data.Location);
        });
    });
};

/**
 * Takes screenshot for each shared page in given array and saves its url
 * @param {Array} sharedPages - array of shared pages (with additional properties: url and subdomain)
 */
const saveScreenshots = async (sharedPages) => {
    const browser = await prepareBrowser();

    try {
        await Promise.all(sharedPages.map(async (sharedPage) => {
            const image = await takeScreenshot(sharedPage, browser);
            const url = await uploadImage(sharedPage, image);

            return await SharedPage.findByIdAndUpdate(sharedPage._id, { $set: { imageUrl: url } });
        }));

        await browser.close();
    } catch (e) {
        await browser.close();
        throw e;
    }
};

module.exports.saveScreenshots = saveScreenshots;


const getScreenshot = async (sharedPage, options) => {
    const browser = await prepareBrowser();

    sharedPage.extra = {
        fullScreenshot: true,
        fullPage: true,
        ...options,
    };

    try {
        const image = await takeScreenshot(sharedPage, browser);

        await browser.close();

        return image;
    } catch (e) {
        await browser.close();
        throw e;
    }
};

module.exports.getScreenshot = getScreenshot;
