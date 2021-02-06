/**
 * Instantiates the ViewBy based on the requested path
 */
module.exports.instantiateViewBy = (path) => {
    return {
        insights: path === '/insights' ? 'active' : '',
        articles: path === '/articles' ? 'active' : '',
        visualizations: path === '/' || path === '/visualizations' ? 'active' : ''
    };
};

/**
 * Checks to see if there any insights / articles
 * If there are none, then it switches active to visualizations
 * @param {Object} viewBy
 */
module.exports.checkForEmptyArticlesOrInsights = (viewBy, storiesNotActive, articlesNotActive) => {
    if (storiesNotActive && viewBy.insights === 'active') {
        viewBy.insights = '';
        viewBy.visualizations = 'active';
    } else if (articlesNotActive && viewBy.articles === 'active') {
        viewBy.articles = '';
        viewBy.visualizations = 'active';
    }
    return viewBy;
};

/**
 * Based on the viewBy, modify the baseurl to include the tab
 */
module.exports.modifyBaseUrl = (viewBy, baseUrl) => {
    if (viewBy.insights === 'active') {
        baseUrl += '/insights';
    } else if (viewBy.articles === 'active') {
        baseUrl += '/articles';
    } else {
        baseUrl += '/visualizations';
    }

    return baseUrl;
};
