const winston = require('winston');

module.exports.puppeteerJSAuth = function (req, res, next) {
    if (req.headers['x-screenshot-token'] === process.env.SCREENSHOT_SECRET) {
        winston.debug('Puppeteer detected and authorized');
        req.puppeteer = true;
        req.isAuthorized = true;
        req.overrideAuth = true;
    }

    if (req.headers['x-screenshot-full'] === process.env.SCREENSHOT_SECRET) {
      req.puppeteerScreenshot = true;
    }

    next();
};
