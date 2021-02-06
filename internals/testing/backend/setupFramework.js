const { configureWinston } = require('../../../app/utils/winston');

configureWinston();

const { connectionPromise } = require('../../../app/models/mongoose_client');
const { queue } = require('../../../app/boot/queue-init');

beforeAll(async () => {
    await connectionPromise;
    queue.testMode.enter();
}, 30000);

afterEach(() => {
    queue.testMode.clear();
});

afterAll(() => {
    queue.testMode.exit();
});
