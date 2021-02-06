const jwt = require('jsonwebtoken');

const Tokens = require('../../models/tokens');

module.exports.validate = async (req, res) => {
    try {
        const { tokenId } = req.params;
        const token = await Tokens.findById(tokenId);

        if (token.usedAt) {
            return res.status(500).send({ error: 'This token has expired.', errorType: 'used' });
        }

        await jwt.verify(token.token, process.env.SESSION_SECRET);
        return res.status(200).send({ message: 'This token is valid.' });
    } catch (e) {
        return res.status(500).send({ error: 'This token has expired.', errorType: 'expired' });
    }
};
