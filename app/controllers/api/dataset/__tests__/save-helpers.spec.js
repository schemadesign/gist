import * as saveHelpers from '../save-helpers';
import { team1 } from '../../../../../internals/testing/backend/fixtures/teams';
import { hydrateDb } from '../../../../../internals/testing/backend/utils';
import { pokemon1 } from '../../../../../internals/testing/backend/fixtures/datasets';
import { user1 } from '../../../../../internals/testing/backend/fixtures/users';


const datasource_description = require('../../../../models/descriptions');
const Team = require('../../../../models/teams');

describe('SaveHelpers', () => {

    beforeEach(async () => {
        await hydrateDb();
    });

    describe('updateColumns', () => {
        it('should assign data_type for columns from row object', () => {
            const columns = [
                { name: 'col1', operation: 'ToInteger', data_type: 'Number' },
                { name: 'col2', operation: 'ToString', data_type: 'Text' },
                { name: 'col3', operation: 'ToDate', data_type: 'Date' },
            ];

            const rowObject = {
                col1: { operation: 'ToString' },
                col2: { operation: 'ToString' },
                col3: { operation: 'ToDate' },
            };
            saveHelpers.updateColumns(rowObject, columns);
            expect(columns[0].data_type).toBe('Text');
            expect(columns[1].data_type).toBe('Text');
            expect(columns[2].data_type).toBe('Date');
        });
    });

    describe('createNewDataset', () => {
        it('should create a new dataset', async () => {
            const req = { body: { _team: team1, user: '5a42bf07d3bc0b20648290e0' } };
            const docId = await saveHelpers.createNewDataset(req);

            const team = await Team.findById(team1._id);

            expect(team.datasourceDescriptions).toContain(docId.data.id);
        });

        it('should fail back when the team is not found', async () => {
            const fakeTeam = { _team: 'fake' };
            const numberOfDatasets = await datasource_description.count({});
            expect(saveHelpers.createNewDataset(fakeTeam)).rejects.not.toBeNull();
            expect(await datasource_description.count()).toBe(numberOfDatasets);
        });
    });

    describe('updateExistingDataset', () => {
        it('should update existing dataset', async () => {
            const args = {
                _id: pokemon1,
                title: 'New Title',
            };
            const updatedDataset = await saveHelpers.updateExistingDataset(args, user1._id);

            const dataset = await datasource_description.findById(updatedDataset.description._id);
            expect(dataset.title).toBe('New Title');
        });

        it('should not update anything when no changed properties are provided', async () => {
            const args = {
                _id: pokemon1,
            };
            const updateDataset = await saveHelpers.updateExistingDataset(args, user1._id);

            expect(updateDataset.description._id.toString()).toBe(pokemon1._id.toString());
        });

        it('should unset dataset.state if fe_listed changes to false', async () => {
            const args = {
                _id: pokemon1,
                fe_listed: false,
            };
            const updateDataset = await saveHelpers.updateExistingDataset(args, user1._id);

            expect(updateDataset.description.state).toBeUndefined();
        });

        it('should unset dataset.state if isPublic changes to false', async () => {
            const args = {
                _id: pokemon1,
                isPublic: false,
            };
            const updateDataset = await saveHelpers.updateExistingDataset(args, user1._id);

            expect(updateDataset.description.state).toBeUndefined();
        });

        it('should remove draft', async () => {
            const args = {
                _id: pokemon1._id,
            };

            await saveHelpers.updateExistingDataset(args, user1._id);
            const dataset = await datasource_description.findOne({ master_id: pokemon1._id });
            expect(dataset).toBe(null);
        });
    });
});
