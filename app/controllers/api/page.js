const async = require('async');
const _ = require('lodash');
const winston = require('winston');
const ObjectID = require('mongodb').ObjectID;
const validator = require('validator');

const Page = require('../../models/pages');
const User = require('../../models/users');
const Website = require('../../models/websites');
const Team = require('../../models/teams');
const { addSlugIndex } = require('../../utils/helpers');
const markdown = require('./../../libs/utils/markdown');
const s3ImageHosting = require('./../../libs/utils/aws-image-hosting');
const s3FileHosting = require('./../../libs/utils/aws-datasource-files-hosting');

const ALLOWED_FILE_TYPES = /image\/bmp|image\/gif|image\/jpeg|image\/png|image\/svg\+xml|image\/svg xml|application\/pdf/gm;

/**
 * Callback for finding user.
 *
 * @callback asyncCallback
 * @param {object} err - an error or null.
 * @param {object} user - found user or null.
 */

/**
 * Find user by id.
 *
 * @param {string} id - User id.
 * @param {asyncCallback} callback - A callback to run.
 */
const findUser = (id, callback) => {
    User.findById(id)
        .populate('defaultLoginTeam')
        .lean()
        .exec((err, user) => {
            if (err) {
                return callback(err);
            } else {
                callback(null, user);
            }
        });
};

/**
 * Callback for constructing pages query.
 *
 * @callback asyncCallback
 * @param {object} err - null.
 * @param {object} user - user from findUser func.
 * @param {object} pagesQuery - the constructed query or empty object.
 */

/**
 * construct query for pages.
 *
 * @param {object} query - A query that denotes whether to return all pages.
 * @param {object} user - User
 * @param {asyncCallback} callback - A callback to run.
 */
const constructPagesQuery = (query, user, callback) => {
    const pagesQuery = {};

    if (query.returnAll === 'false') {
        pagesQuery.$or = [
            { createdBy: user._id },
            { _id: { $in: [...user._articleViewers, ...user._articleEditors] } },
        ];
    }

    callback(null, user, pagesQuery);
};

/**
 * Callback for finding website.
 *
 * @callback asyncCallback
 * @param {object} err - an error or null.
 * @param {object} pagesQuery - pass the query object on.
 */

/**
 * Find website by team and add the site id to the pages query object.
 *
 * @param {object} user - User info.
 * @param {object} pagesQuery - The query for pages.
 * @param {asyncCallback} callback - A callback to run.
 */
const findWebsite = (user, pagesQuery, callback) => {
    const query = {
        team: user.defaultLoginTeam._id,
        slug: user.defaultLoginTeam.subdomain,
    };

    Website.findOne(query)
        .populate('pages')
        .populate('homepage')
        .exec((err, site) => {
            if (err) {
                return callback(err);
            } else if (!site) {
                callback(null, null);
            } else {
                pagesQuery.website = site._id;
                callback(null, pagesQuery);
            }
        });
};

/**
 * Callback for finding pages by website.
 *
 * @callback findPagesByWebsite callback
 * @param {object} err - an error or null.
 * @param {object} pages - found pages/empty array or null.
 */

/**
 * Find pages by website id and limit by pages user can edit or has authored, if applicable.
 * If no pages exist, return empty array.
 *
 * @param {string} siteId - website id.
 * @param {object} query - A query object for this function.
 * @param {asyncCallback} callback - A callback to run.
 */
const findPagesByWebsite = (query, callback) => {
    if (!query) {
        return callback(null, []);
    }

    Page.find(query)
        .populate('website')
        .exec((err, pages) => {
            if (err) {
                return callback(err);
            } else {
                callback(null, pages);
            }
        });
};

/**
 * Callback for copying page.
 *
 * @callback asyncCallback
 * @param {object} err - an error or null.
 * @param {object} createdPage - created page.
 */

/**
 * Copy a page: clone page properties and copy each asset from
 * original page to new page. Create page then populate website.
 *
 * @param {Object} page - page to clone.
 * @param {Object} site - website for given page.
 * @param {asyncCallback} callback - a callback to run
 */
const _copyPage = async (page, site, callback) => {
    const suffix = 'copy';
    const customSlug = 'overview';

    let newPage = _.clone(page);

    newPage.pageTitle += ` ${suffix}`;

    if (customSlug !== newPage.slug) {
        newPage.slug += `-${suffix}`;
    }

    newPage.website = site._id;
    newPage._id = ObjectID();
    newPage.published = false;

    delete newPage.createdAt;

    const slugQuery = new RegExp(`^${newPage.slug}`, 'i');
    const slugs = await Page.find({ slug: { $in: [slugQuery] }, website: newPage.website }, { slug: 1, _id: 0 });

    addSlugIndex(slugs, newPage, 'pageTitle');

    let assets = [];
    let filePathArray;
    if (page.thumbnail) {
        filePathArray = page.thumbnail.split('/');

        assets.push({
            imageType: 'thumbnail',
            fileName: filePathArray[filePathArray.length - 1],
        });
    }
    if (page.image) {
        filePathArray = page.image.split('/');

        assets.push({
            imageType: 'image',
            fileName: filePathArray[filePathArray.length - 1],
        });
    }

    async.each(assets, (asset, eachCallback) => {
        let args = {
            websiteId: site._id,
            pageId: newPage._id,
            originalWebsiteId: page.website._id,
            originalPageId: page._id,
            imageType: asset.imageType,
            fileName: asset.fileName,
            subdomain: page.team.subdomain,
        };

        s3ImageHosting.copyPageAssets(args, (err) => {
            if (err) {
                newPage[asset.imageType] = null;
                eachCallback(err);
            } else {
                newPage[asset.imageType] = 'https://' + process.env.DO_S3_BUCKET + '.sfo2.digitaloceanspaces.com/' + page.team.subdomain + '/websites/' + site._id + '/pages/' + newPage._id + '/' + asset.imageType + '/' + asset.fileName;
                eachCallback();
            }
        });
    }, (err) => {
        Page.create(newPage, (err, createdPage) => {
            if (err) {
                return callback(err);
            } else {
                createdPage.populate('team website createdBy', (err, populatedPage) => {
                    site.pages.push(populatedPage._id);
                    populatedPage.team.pages.push(populatedPage._id);
                    site.save();
                    populatedPage.team.save();
                    callback(err, populatedPage);
                });
            }
        });

    });
};
module.exports.copyPage = _copyPage;

/**
 * make a copy of a page
 * find the page to copy then run through waterfall tasks.
 *
 * @param {Object} req - request
 * @param {Object} res - response
 */
var makeCopy = function (req, res) {
    // find the page
    Page.findById(req.body.copyOf)
        .populate('team')
        .lean()
        .exec((err, page) => {
            if (err) {
                res.status(500).send({ error: 'An error occurred while making copy of a page.' });
            } else if (!page) {
                res.status(500).send('No page found for duplication.');
            } else {
                Website.findById(page.website, (err, site) => {
                    page.website = _.clone(site);
                    _copyPage(page, site, (err, newPage) => {
                        if (err || !newPage) {
                            winston.error(err);
                            res.status(500).send(err || 'Could not clone page');
                        } else {
                            res.status(200).json(newPage);
                        }
                    });
                });
            }
        });
};

/**
 * Callback for finding pages by id.
 *
 * @callback findPageCallback
 * @param {object} err - an error or null.
 * @param {object} page - found page or null.
 */

/**
 * Find page by id.
 *
 * @param {string} id - website id.
 * @param {findPageCallback} callback - A callback to run.
 */
const findPage = (id, callback) => {
    Page.findById(id)
        .populate('createdBy')
        .populate('team')
        .populate({
            path: 'website',
            populate: { path: 'homepage' },
        })
        .exec((err, page) => {
            callback(err, page);
        });
};

/**
 * Callback for setting state.
 *
 * @callback setStateCallback
 * @param {object} err - an error or null.
 * @param {object} page - the page with updated state.
 */

/**
 * Set the approval state for listing article on arrays explore page.
 *
 * @param {string} state - the state to update.
 * @param {object} page - the page for which to set the state.
 * @param {setStateCallback} callback - a callback to run.
 */
const setState = (state, page, callback) => {
    if (state === 'pending' && page.state === 'pending') {
        return callback(new Error('Request has already been submitted and is pending'));
    } else {
        page.state = state;
        page.save();
        callback(null, page);
    }
};

/**
 * Callback for sending email notifying whether or not page is approved.
 *
 * @callback sendEmailCallback
 * @param {object} err - an error or null.
 * @param {object} page - the page that has been updated.
 */

/**
 * Find all pages
 */
module.exports.getAll = function (req, res) {

    Page.find({})
        .exec((err, pages) => {
            if (err) {
                winston.error(err);
                res.send({ error: err.message });
            } else {
                res.status(200).json(pages);
            }
        });
};

/**
 * Get all pages by website.
 * If website_id req.param is present, then it's a page within a site
 * If website_id req.param is not present, then it's an article.
 */
module.exports.getByWebsite = function (req, res) {
    if (req.params.website_id === 'null' || !req.params.website_id || req.params.website_id === 'undefined') {

        async.waterfall([
            async.apply(findUser, req.user),
            async.apply(constructPagesQuery, req.query),
            findWebsite,
            findPagesByWebsite,
        ], (err, pages) => {
            if (err) {
                winston.error(err);
                res.status(500).json({ error: 'An error occurred while getting a website.' });
            } else {
                res.status(200).json(pages);
            }
        });

    } else {
        const query = { website: req.params.website_id };
        findPagesByWebsite(query, (err, pages) => {
            if (err) {
                winston.error(err);
                res.status(500).json({ error: 'An error occurred while getting a website.' });
            } else {
                res.status(200).json(pages);
            }
        });
    }
};

module.exports.getByTeam = function (req, res) {

    Page.find({ team: req.params.id })
        .populate('website')
        .exec((err, pages) => {
            if (err) {
                winston.error(err);
                res.send({ error: err });
            } else {
                res.status(200).json({ pages: pages });
            }
        });
};

/**
 * Create new page.
 * If error, return error
 * If there's a property, makeCopy, flagged in the req.body - make a copy of an existing page.
 */
module.exports.create = function (req, res) {
    if (req.body.makeCopy) {
        makeCopy(req, res);
    } else if (!req.body.website) {
        winston.error('No website assiociated with page - returning 500');
        return res.status(500).send(new Error('No website associated with page'));
    } else {
        Page.create(req.body, (err, createdPage) => {
            if (err) {
                res.status(500).send(err.message);
            } else {
                // Website.update({_id: createdPage.website}, {$push: {pages: createdPage}})
                createdPage.populate('website team createdBy', (err, page) => {
                    if (err) {
                        res.status(500).send(err.message);
                    } else {
                        page.website.pages.push(page._id);
                        page.team.pages.push(page._id);
                        page.createdBy._articleEditors.push(page._id);
                        page.team.save();
                        page.website.save();
                        page.createdBy.save();
                        return res.json(page);
                    }
                });
            }
        });
    }
};

module.exports.search = function (req, res) {

    Page.find(req.query, (err, foundPages) => {
        if (err) {
            res.send({ error: err.message });
        } else {
            return res.status(200).json(foundPages);
        }
    });
};

module.exports.get = function (req, res) {

    Page.findById(req.params.id)
        .populate('website')
        .exec((err, foundPage) => {
            if (err) {
                res.send({ error: err.message });
            } else {
                return res.status(200).json(foundPage);
            }
        });
};


module.exports.update = function (req, res) {
    if (req.body.parsedBody) {
        req.body.parsedBody = validator.escape(req.body.parsedBody);
    }

    if (req.body.rawBody) {
        req.body.parsedBody = markdown.parseMarkdown(req.body.rawBody) || '';
        req.body.parsedBody = markdown.replaceCharts(req.body.parsedBody) || '';
    }

    if (req.body.rawSummary) {
        req.body.parsedSummary = markdown.parseMarkdown(req.body.rawSummary) || '';
    }

    if (req.body.rawAbout) {
        req.body.parsedAbout = markdown.parseMarkdown(req.body.rawAbout) || '';
    }

    const requestBodyKeys = Object.keys(req.body);

    // we can't use findByIdAndUpdate here because it doesn't allow for pre-hooks
    Page.findById(req.params.id, (err, page) => {
        if (err) {
            return res.status(500).send(err);
        }
        _.each(requestBodyKeys, function (key) {
            page[key] = req.body[key];
        });

        page.save({ new: true }, (err, updatedPage) => {
            if (err) {
                winston.error(err);
                return res.status(500).send(err);
            } else {
                res.status(200).json(page);
            }
        });
    });
};

module.exports.delete = function (req, res) {
    /**
     * Callback for pulling article ref. from team
     *
     * @callback teamPullCallback
     * @param {object} err - an error or null
     * @param {object} article - the article.
     */

    /**
     * If article, pull the reference from the team
     * else skip this
     *
     * @param {object} article - the article.
     * @param {teamPullCallback} callback - a callback to run
     */
    const pullArticleFromTeam = (article, callback) => {
        if (article.isArticle) {
            const updateQuery = {
                $pull: {
                    pages: article._id,
                },
            };

            Team.findByIdAndUpdate(article.team, updateQuery, (err) => {
                callback(err, article);
            });
        } else {
            callback(null, article);
        }
    };

    /**
     * Callback for pulling article from any users with viewer or editor privledges
     *
     * @callback usersPullCallback
     * @param {object} err - an error or null
     * @param {object} article - the article
     */

    /**
     * If it's an article, remove reference from all users with viewer and/or editor privleges
     * else skip
     *
     * @param {object} article - article
     * @param {usersPullCallback} callback - a callback to run.
     */
    const pullArticleFromUsers = (article, callback) => {
        if (article.isArticle) {
            const updateQuery = {
                $pull: {
                    _articleEditors: article._id,
                    _articleViewers: article._id,
                },
            };

            User.update({}, updateQuery, { multi: true }, (err) => {
                callback(err, article);
            });
        } else {
            callback(null, article);
        }
    };

    /**
     * Callback for updating site and removing page
     *
     * @callback updateAndRemoveCallback
     * @param {object} err - an error or null
     * @param {object} site - the site the article was removed from
     */

    /**
     * Remove article or page reference from the site.
     *
     * @param {object} page - the page or article to remove
     * @param {updateAndRemoveCallback}
     */
    const updateSiteAndRemovePage = (page, callback) => {
        let site = page.website;
        if (site.homepage && site.homepage.slug === page.slug) {
            site.homepage = null;
        } else {
            var spliceIndex = site.pages.indexOf(page._id);
            site.pages.splice(spliceIndex, 1);
        }
        site.save();
        page.remove();
        callback(null, site);
    };

    async.waterfall([
        async.apply(findPage, req.params.id),
        pullArticleFromTeam,
        pullArticleFromUsers,
        updateSiteAndRemovePage,
    ], (err, site) => {
        if (err) {
            return res.status(500).json('Couldn\'t delete page');
        } else {
            res.status(200).send(site);
        }
    });
};

module.exports.signedUrlForAssetsUpload = function (req, res) {
    if (!req.query.fileType.match(ALLOWED_FILE_TYPES)) {
        return res.status(406).send({ error: 'Invalid file format' });
    }

    Page.findById(req.params.id)
        .populate('team')
        .populate('website')
        .exec((err, page) => {
            const fileName = req.query.fileName.replace(/'/g, '');
            const key = page.team.subdomain + '/websites/' + page.website._id + '/pages/' + page._id + '/' + req.query.assetType + '/' + fileName;

            s3ImageHosting.signedUrlForPutObject(key, req.query.fileType, (err, data) => {
                if (err) {
                    return res.status(500).send({ error: err.message });
                } else {
                    return res.json({ putUrl: data.putSignedUrl, publicUrl: data.publicUrl });
                }
            });

        });
};

module.exports.deleteImage = function (req, res) {
    Page.findById(req.params.id)
        .populate('team')
        .populate('website')
        .exec((err, page) => {
            const key = page.team.subdomain + '/websites/' + page.website._id + '/pages/' + page._id + '/' + req.params.folder + '/' + req.params.fileName;
            s3FileHosting.deleteObject(key, (err, data) => {
                if (err) {
                    return res.status(500).send({ error: err.message });
                } else {
                    page.thumbnail = '';
                    page.save();
                    return res.json({ page: page });
                }
            });
        });
};

module.exports.approvalRequest = function (req, res) {
    const pageId = req.params.id;

    async.waterfall([
        async.apply(findPage, pageId),
        async.apply(setState, req.body.state),
    ], (err) => {
        if (err) {
            return res.status(500).json(err);
        } else {
            return res.status(200).json({});
        }
    });
};

