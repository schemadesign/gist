const jwt = require('jsonwebtoken');

const User = require('../../models/users');
const Tokens = require('../../models/tokens');

module.exports.get = async (req, res) => {
    try {
        const user = await User.findById(req.user);
        const url = req.protocol + '://' + req.get('host');

        if (user.isSuperAdmin()) {
            const token = jwt.sign({ userId: user._id }, process.env.SESSION_SECRET, { expiresIn: '48h' });

            const { id } = await Tokens.create({ token });
            return res.status(200).json({ link: `${url}/signup/email?token=${id}` });
        }

        res.status(500).send({ error: 'User is not a super admin.' });
    } catch (e) {
        res.status(500).send({ error: 'An error occurred on generating link.' });
    }
};
