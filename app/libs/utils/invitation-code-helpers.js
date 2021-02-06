const crypto = require('crypto');

/**
 * Returns a sha512 hash of the given string.
 * @param confirmation_code - Code to hash
 * @return
 */
module.exports.createHashWithString = confirmation_code => {
    // Create a new hash, and then update it and return the digest
    const hash = crypto.createHash('sha512');
    hash.update(confirmation_code);
    return hash.digest('hex');
};

/**
 * Generates a random short code.
 * @param codeSize - Size in bytes to generate a code
 * @return
 */
module.exports.generateRandomCode = codeSize => {
    // Get a random buffer
    const randomBuffer = crypto.randomBytes(codeSize);
    // Return the random buffer to string
    return randomBuffer.toString('hex');
};
