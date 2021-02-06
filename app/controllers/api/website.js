const winston = require('winston');
const async = require('async');
const { uniq, pull, get } = require('lodash');
const ObjectID = require('mongodb').ObjectID;

const Website = require('../../models/websites');
const User = require('../../models/users');
const Page = require('../../models/pages');
const Team = require('../../models/teams');
const PageCtrl = require('./page');
const { addSlugIndex } = require('../../utils/helpers');

/**
 * Callback for finding website by id
 *
 * @callback findWebsiteByIdCallback
 * @param {object} err - an error or null
 * @param {object} site - found website
 */

/**
 * Find a website by id
 *
 * @param {object} id - website id
 * @param {findWebsiteByIdCallback} callback - a callback to run.
 */
const findWebsiteById = (id, callback) => {
    Website.findById(id, (err, website) => {
        callback(err, website);
    }).populate('pages');
};

const publishedOperator = req => (req.user ? { $exists: true } : { $eq: true });

module.exports.get = function(req, res) {
    findWebsiteById(req.params.id, (err, website) => {
        if (err) {
            winston.error(err);
            return res.send({ error: err.message });
        }

        if (!website) {
            return res.status(404).send({ error: 'Website does not exist.' });
        }

        if (!website.published && !get(req, ['query', 'app'], false)) {
            return res.status(401).send({ error: 'Website is not published, please login to Gist to access it.' });
        }

        res.status(200).json(website);
    });
};

module.exports.getAll = function(req, res) {
    Website.find({ published: publishedOperator(req) })
        .populate('pages')
        .exec((err, websites) => {
            if (err) {
                winston.error(err);
                res.send({ error: err.message });
            } else {
                res.status(200).json(websites);
            }
        });
};

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
 * Callback for creating website.
 *
 * @callback asyncCallback
 * @param {object} err - an error or null.
 * @param {object} site - created website or null.
 */

/**
 * Create website.
 *
 * @param {object} user - User object.
 * @param {createSiteCallback} callback - A callback to run.
 */
const createSite = (user, callback) => {
    let site = {};
    site.title = user.defaultLoginTeam.title;
    site.slug = user.defaultLoginTeam.subdomain;
    site.team = user.defaultLoginTeam._id;
    Website.create(site, (err, createdSite) => {
        callback(err, createdSite);
    });
};

/**
 * Get one website by team subdomain.
 * If error, return error
 * If there's no websites, create a team site.
 * If there are websites, return website.
 */
module.exports.getByTeamAndSubdomain = function(req, res) {
    const query = {
        team: req.params.team_id,
        slug: req.params.subdomain,
    };

    Website.findOne(query).exec((err, website) => {
        if (err) {
            winston.error(err);
            return res.status(500).send({ error: 'An error occurred while getting team subdomain.' });
        } else if (!website) {
            // the only reason we find the user is to get the team title
            // it can be taken out if we want the title to be the same as the subdomain/slug
            async.waterfall([async.apply(findUser, req.user), createSite], (err, website) => {
                if (err) {
                    winston.error(err);
                    res.status(500).send({ error: 'An error occurred while getting team subdomain.' });
                } else {
                    res.status(200).json(website);
                }
            });
        } else {
            res.status(200).json(website);
        }
    });
};
/**
 * Callback for constructing query.
 *
 * @callback asyncCallback
 * @param {object} null.
 * @param {object} query - constructed query object.
 */

/**
 * Construct query for finding websites.
 *
 * @param {object} query - denotes whether to return all sites for given team or just those that user has access to.
 * @param {object} user - A user.
 * @param {asyncCallback} callback - A callback to run.
 */
const constructQuery = (query, user, callback) => {
    let siteQuery = {
        team: user.defaultLoginTeam._id,
        title: { $ne: user.defaultLoginTeam.title },
    };

    if (query.allSites === 'false') {
        siteQuery.$or = [{ createdBy: user._id }, { _id: { $in: uniq([...user._siteEditors, ...user._siteViewers]) } }];
    }
    callback(null, siteQuery);
};

/**
 * Callback for finding website.
 *
 * @callback asyncCallback
 * @param {object} err - an error or null.
 * @param {object} pages - found sites, empty array or null.
 */

/**
 * Find websites by query.
 * If no sites exist, return empty array.
 *
 * @param {object} query - constructed query
 * @param {asyncCallback} callback - A callback to run.
 */
const findWebsites = (query, callback) => {
    Website.find(query)
        .populate('team')
        .exec((err, sites) => {
            if (err) {
                return callback(err);
            } else {
                callback(err, sites);
            }
        });
};

/**
 * Get websites by team - except for the site that the articles are hosted on.
 * If query.allSites is false, only get the sites that a given user is authorized to see.
 * If error, return error
 * If there are websites, return websites.
 */
module.exports.getByTeam = function(req, res) {
    async.waterfall(
        [async.apply(findUser, req.user), async.apply(constructQuery, req.query), findWebsites],
        (err, sites) => {
            if (err) {
                res.send({ error: err.message });
            } else {
                res.status(200).json(sites);
            }
        }
    );
};

/**
 * Callback for creating website copy
 *
 * @callback copyWebsiteCallback
 * @param {object} err - an error or null
 * @param {object} args - pages, site and homepage
 */

/**
 * Create a copy of the site with changes to relevant fields
 * Push the site to the team sites array after creating
 *
 * @param {object} args - args with site to copy, pages and homepage
 * @param {copyWebsiteCallback} callback - a callback to run
 */
const createWebsiteCopy = async (args, callback) => {
    const suffix = 'copy';
    const { title, slug, team } = args.site;
    const newSite = {
        _id: ObjectID(),
        title: `${title} ${suffix}`,
        slug: `${slug}-${suffix}`,
        team,
        createdBy: args.user,
    };
    const slugQuery = new RegExp(`^${newSite.slug}`, 'i');
    const slugs = await Website.find({ slug: { $in: [slugQuery] } }, { slug: 1, _id: 0 });

    addSlugIndex(slugs, newSite);

    Website.findByIdAndUpdate(newSite._id, newSite, { new: true, upsert: true })
        .populate('team')
        .exec((err, createdSite) => {
            if (err || !createdSite) {
                err = err || new Error(`Site copy of ${args.site.title} was not created`);
                return callback(err);
            } else {
                createdSite.team.sites.push(createdSite._id);
                createdSite.team.save();
                args.site = createdSite;
                callback(err, args);
            }
        });
};

/**
 * Callback for creating homepage copy
 *
 * @callback copyHomepageCallback
 * @param {object} err - error or null
 * @param {object} args - pages, updated site and updated homepage
 */

/**
 * Create a copy of the site homepage
 *
 * @param {object} args - updated site, pages and homepage to copy
 * @param {copyHomepageCallback} callback - a callback to run
 */
const createHomepageCopy = (args, callback) => {
    /**
     * Callback for handling error from finding page
     *
     * @callback handleErrorCallback
     */

    /**
     * handle error for page find query
     *
     * @param {object} site - copied site to delete
     * @param {handleErrorCallback} errorCallback - a callback to run
     */
    const handleError = (site, errorCallback) => {
        winston.error('Something went wrong when retrieving page - deleting copied site');
        site.remove();
        errorCallback();
    };

    // call with lean so a regular object is returned instead of mongoose doc
    Page.findById(args.homepage)
        .populate('team')
        .lean()
        .exec((err, homepage) => {
            if (err) {
                handleError(args.site, () => {
                    return callback(err);
                });
            } else if (!homepage) {
                callback(err, args);
            } else {
                PageCtrl.copyPage(homepage, args.site, (err, createdHomepage) => {
                    args.homepage = createdHomepage;
                    callback(err, args);
                });
            }
        });
};

/**
 * Callback for copying all pages for a given site
 *
 * @callback copyPagesCallback
 * @param {object} err - an error or null
 * @param {object} args - args with newPages array as pages, updated site and updated homepage
 */

/**
 * create a copy of each of the pages for a given site.
 * Loops through each of the pages and makes a copy. Pushes that copy to an array, newPages.
 *
 * @param {object} args - updated site, original pages, and updated homepage
 * @param {copyPagesCallback} callback - a callback to run
 */
const createPagesCopies = (args, callback) => {
    /**
     * Callback for handling error from copying pages
     *
     * @callback handleErrorCallback
     */

    /**
     * handle error for finding and/or copying pages
     *
     * @param {object} site - copied site to delete
     * @param {array} pages - any copied pages to delete
     * @param {handleErrorCallback} errorCallback - a callback to run
     */
    const handleError = (site, pages, errorCallback) => {
        winston.error('Something went wrong when copying pages - deleting copied site and any existing pages');

        async.each(
            pages,
            page => {
                page.remove();
            },
            () => {
                site.remove();
                errorCallback();
            }
        );
    };

    let newPages = [];

    async.eachSeries(
        args.pages,
        (page, eachCallback) => {
            // call with lean so a regular object is returned instead of mongoose doc
            Page.findById(page)
                .populate('team')
                .lean()
                .exec((err, foundPage) => {
                    if (err) {
                        return eachCallback(err);
                    }
                    if (!foundPage) {
                        winston.warn('No Page found', page);
                        return eachCallback();
                    }
                    PageCtrl.copyPage(foundPage, args.site, (err, createdPage) => {
                        if (createdPage) {
                            newPages.push(createdPage._id);
                        }
                        return eachCallback(err);
                    });
                });
        },
        err => {
            if (err) {
                handleError(args.site, newPages, () => {
                    return callback(err);
                });
            } else {
                args.pages = newPages;
                callback(err, args);
            }
        }
    );
};

/**
 * Callback for updating a website
 *
 * @callback updateWebsiteCallback
 * @param {object} err - an error or null
 * @param {object} updatedSite - the updated website
 */

/**
 * Update a website.
 * Set the pages and homepage to be the copied objects (attached to args) and save
 *
 * @param {object} args - copied site, newPages and copied homepage
 * @param {updateWebsiteCallback} callback - a callback to run
 */
const updateWebsite = (args, callback) => {
    /**
     * Callback for handling error from updating site
     *
     * @callback handleErrorCallback
     */

    /**
     * handle error for updating site
     *
     * @param {object} site - copied site to delete
     * @param {array} pages - any copied pages to delete
     * @param {handleErrorCallback} errorCallback - a callback to run
     */
    const handleError = (site, pages, errorCallback) => {
        winston.error('Something went wrong when updating site - deleting copied site and any existing pages');

        async.each(
            pages,
            page => {
                page.remove();
            },
            () => {
                site.remove();
                errorCallback();
            }
        );
    };

    args.site.pages = args.pages;
    args.site.homepage = args.homepage ? args.homepage._id : null;

    Website.findByIdAndUpdate(args.site._id, args.site, { new: true })
        .populate('homepage createdBy')
        .populate('pages')
        .exec((err, updatedSite) => {
            if (err) {
                handleError(args.site, args.pages, () => {
                    return callback(err);
                });
            } else {
                callback(err, updatedSite);
            }
        });
};

/**
 * initiate waterfall of copying site
 */
const makeCopy = (req, res) => {
    findWebsiteById(req.body.copyOf, (err, site) => {
        if (err) {
            res.status(500).send({ error: 'An error occurred while finding website.' });
        } else if (!site) {
            res.status(500).send('No site found for duplication.');
        } else {
            const args = {
                homepage: site.homepage,
                pages: site.pages,
                site: site,
                user: req.user,
            };

            async.waterfall(
                [async.apply(createWebsiteCopy, args), createHomepageCopy, createPagesCopies, updateWebsite],
                (err, updatedSite) => {
                    if (err || !updatedSite) {
                        // delete site
                        res.status(500).send(err || 'Could not update site.');
                    } else {
                        res.status(200).json(updatedSite);
                    }
                }
            );
        }
    });
};

module.exports.create = function(req, res) {
    // copy an existing site
    if (req.body.makeCopy) {
        makeCopy(req, res);
    } else {
        // create a new site
        Website.create(req.body, (err, createdWebsite) => {
            if (err) {
                res.status(500).send({ error: 'An error occurred while creating a website.' });
            } else {
                createdWebsite.populate(
                    ['team', { path: 'createdBy', populate: { path: 'defaultLoginTeam' } }],
                    (err, site) => {
                        if (err) {
                            res.status(500).send({ error: 'An error occurred on populate new website.' });
                        } else {
                            site.team.sites.push(site._id);
                            site.createdBy._siteEditors.push(site._id);
                            site.team.save();
                            site.createdBy.save();
                            res.status(200).json(site);
                        }
                    }
                );
            }
        });
    }
};

module.exports.search = function(req, res) {
    Website.find(req.query, (err, foundWebsites) => {
        if (err) {
            res.send({ error: err.message });
        } else {
            return res.status(200).json(foundWebsites);
        }
    });
};

module.exports.update = function(req, res) {
    let website = req.body;

    if (website.newHomepage) {
        website.pages = pull(website.pages, website.newHomepage);

        if (website.homepage) {
            website.pages.push(website.homepage);
        }

        website.homepage = website.newHomepage;
    }

    Website.findByIdAndUpdate(website._id, { $set: website }, { new: true }).exec((err, website) => {
        if (err) {
            return res.status(500).send(err);
        } else {
            return res.status(200).json(website);
        }
    });
};

/**
 * Callback for deleting website pages.
 *
 * @callback deletePagesCallback
 * @param {object} err - an error or null.
 * @param {object} site - the site.
 */

/**
 * Delete pages in a given site.
 *
 * @param {object} site - a site that will be deleted
 * @param {deletePagesCallback} callback - A callback to run.
 */
const deletePages = (site, callback) => {
    let pagesArray = site.pages;

    // add the homepage to the site array so it also gets deleted
    if (site.homepage) {
        pagesArray.push(site.homepage);
    }

    Page.remove({ _id: { $in: pagesArray } }, err => {
        callback(err, site);
    });
};

/**
 * Callback for pulling site ref. from team
 *
 * @callback teamPullCallback
 * @param {object} err - an error or null
 * @param {object} site - the site.
 */

/**
 * Pull a site reference from the team it belongs to
 *
 * @param {object} site - the site.
 * @param {teamPullCallback} callback - a callback to run
 */
const pullSiteFromTeam = (site, callback) => {
    const updateQuery = {
        $pull: {
            sites: site._id,
        },
    };

    Team.findByIdAndUpdate(site.team, updateQuery, err => {
        callback(err, site);
    });
};

/**
 * Callback for deleting site
 *
 * @callback deleteSiteCallback
 * @param {object} err - an error or null
 * @param {object} site - the site id
 */

/**
 * Delete a site
 *
 * @param {object} site - the site to delete
 * @param {deleteSiteCallback} callback - a callback to run.
 */
const deleteSite = (site, callback) => {
    const siteId = site._id;

    site.remove(err => {
        callback(err, siteId);
    });
};

/**
 * Callback for pulling site from any users with viewer or editor privledges
 *
 * @callback usersPullCallback
 * @param {object} err - an error or null
 */

/**
 * Remove website reference from all users with viewer or editor privleges
 *
 * @param {object} id - site id
 * @param {usersPullCallback} callback - a callback to run.
 */
const pullSiteFromUsers = (id, callback) => {
    const updateQuery = {
        $pull: {
            _siteEditors: id,
            _siteViewers: id,
        },
    };

    User.update({}, updateQuery, { multi: true }, err => {
        callback(err);
    });
};

module.exports.delete = function(req, res) {
    // TODO: Make sure this user has permission to delete this site
    async.waterfall(
        [async.apply(findWebsiteById, req.params.id), deletePages, pullSiteFromTeam, deleteSite, pullSiteFromUsers],
        err => {
            if (err) {
                return res.status(500).send(err);
            } else {
                return res.status(200).json(req.params);
            }
        }
    );
};
