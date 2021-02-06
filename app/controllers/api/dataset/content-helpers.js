// Convert string to positive integer, with default (fallback) value
module.exports.positiveInteger = (input, fallback) => {
    return Math.abs(parseInt(input, 10) || fallback);
};
