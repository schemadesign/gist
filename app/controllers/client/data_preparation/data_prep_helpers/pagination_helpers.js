const MAX_PER_PAGE = 50;

module.exports.calculatePageRanges = calculatePageRanges;

/**
 * @param {Number} numResults
 * @returns {Number[]}
 */
function calculatePageRanges(numResults) {
    let pageRanges = [];

    if (numResults > 50) {
        pageRanges = [5, 10, 20, 50];
    } else if (numResults > 20) {
        pageRanges = [5, 10, 20];
    } else if (numResults > 10) {
        pageRanges = [5, 10];
    } else if (numResults > 5) {
        pageRanges = [5];
    }

    if (!pageRanges.includes(numResults) && numResults < MAX_PER_PAGE) {
        pageRanges.push(numResults);
    }

    return pageRanges;
}
