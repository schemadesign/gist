const fs = require('fs-extra');


module.exports = () => {
    const removeFakeS3FilesTask = fs.remove(`${__dirname}/../../../__mocks__/tmp`);

    return removeFakeS3FilesTask;
};
