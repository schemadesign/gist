module.exports = {
    createTransport: jest.fn().mockReturnValue({
        sendMail: jest.fn(),
    }),
};
