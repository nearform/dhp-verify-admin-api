/**
 * Digital Health Pass 
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 */
const chai = require('chai');
const Sequelize = require('sequelize');

const { expect, assert } = chai;

const testDBModels = require('../../../models/dbmodels');
const constants = require('../../../helpers/constants');

const sequelize = new Sequelize('sqlite::memory:');
const myDAO = require('../../../data-access/dbuser');

// eslint-disable-next-line max-lines-per-function
describe('test-dbuser-mgt', () => {
    before(async () => {
        await testDBModels.init(true, sequelize);

    });

    // eslint-disable-next-line max-lines-per-function
    describe('User crud data', () => {
        const txID = "testTxID";
        beforeEach(async () => {
            const forceSync = true; // clean db
            await testDBModels.DB.sequelize.sync({ force: forceSync });
        });

        describe('addUserInDB simple', () => {

            it('should pass add of custadmin', async () => {
                const customerId = "cust001";
                const orgId = "";
                const userId = "dbu01";
                const role = constants.USER_ROLES.CUSTOMER_ADMIN;
                await myDAO.addDbUser(txID, userId, customerId, orgId, { role });

                const retEntity = await myDAO.getDbUserById(txID, userId);
                expect(retEntity).to.not.be.undefined;
                expect(retEntity.userId).to.equal(userId);
                expect(retEntity.customerId).to.equal(customerId);
                expect(retEntity.orgId).to.equal(constants.WILDCARD_USER_AUTHORIZE);
                expect(retEntity.role).to.equal(role);
            });

            it('should pass add of orgadmin', async () => {
                const customerId = "cust001";
                const orgId = "org001";
                const userId = "dbu01";
                const role = constants.USER_ROLES.ORG_ADMIN;
                await myDAO.addDbUser(txID, userId, customerId, orgId, { role });

                const retEntity = await myDAO.getDbUserById(txID, userId);
                expect(retEntity).to.not.be.undefined;
                expect(retEntity.userId).to.equal(userId);
                expect(retEntity.customerId).to.equal(customerId);
                expect(retEntity.orgId).to.equal(orgId);
            });

            it('should fail add of orgadmin if custId missing', async () => {
                const customerId = '';
                const orgId = "org001";
                const userId = "dbu01";
                const role = constants.USER_ROLES.ORG_ADMIN;
                try {
                    await myDAO.addDbUser(txID, userId, customerId, orgId, { role });
                    assert.fail('expected Error : OrgId is mandatory');
                } catch (err) { // expected
                    expect(err.message).to.contain('must be specified');
                }

            });

            it('should fail add of orgadmin if orgId missing', async () => {
                const customerId = 'cust001';
                const orgId = "";
                const userId = "dbu01";
                const role = constants.USER_ROLES.ORG_ADMIN;
                try {
                    await myDAO.addDbUser(txID, userId, customerId, orgId, { role });
                    assert.fail('expected Error : custId is mandatory');
                } catch (err) { // expected
                    expect(err.message).to.contain('must be specified');
                }

            });

            it('should fail add of custadmin if custId missing', async () => {
                const customerId = '';
                const orgId = "org001";
                const userId = "dbu01";
                const role = constants.USER_ROLES.CUSTOMER_ADMIN;
                try {
                    await myDAO.addDbUser(txID, userId, customerId, orgId, { role });
                    assert.fail('expected Error : custId is mandatory');
                } catch (err) { // expected
                    expect(err.message).to.contain('must be specified');
                }

            });

            it('GET should return empty for incorrect userid', async () => {
                // const metricList = seedAggregatedMetricData();
                const customerId = "cust001";
                const orgId = "org001";
                const userId = "dbu01";
                const role = constants.USER_ROLES.CUSTOMER_ADMIN;
                await myDAO.addDbUser(txID, userId, customerId, orgId, { role });

                const retEntity = await myDAO.getDbUserById(txID, "Random");
                expect(retEntity).to.not.be.undefined;
                expect(retEntity.userId).to.be.undefined;
            });
        });

        describe('User crud others', () => {

            it('should list Users by custId', async () => {
                const customerId = "cust001";
                const orgId = "";
                const userId = "dbu01";
                let role = constants.USER_ROLES.CUSTOMER_ADMIN;
                await myDAO.addDbUser(txID, userId, customerId, orgId, { role });

                const orgId2 = "org002";
                const userId2 = "dbu02";
                role = constants.USER_ROLES.ORG_ADMIN;
                await myDAO.addDbUser(txID, userId2, customerId, orgId2, { role });

                const orgId3 = "org003";
                const userId3 = "dbu03";

                await myDAO.addDbUser(txID, userId3, customerId, orgId3, { role });

                let retEntity = await myDAO.listUsersByCustOrg(txID, "randomCustomer");
                expect(retEntity).to.be.an('array');
                expect(retEntity.length).to.equal(0);

                retEntity = await myDAO.listUsersByCustOrg(txID, customerId);
                expect(retEntity).to.be.an('array');
                expect(retEntity.length).to.equal(3);

                expect(retEntity[0].userId === userId || retEntity[0].userId === userId2
                    || retEntity[0].userId === userId3).to.be.true;
                expect(retEntity[1].userId === userId || retEntity[1].userId === userId2
                    || retEntity[1].userId === userId3).to.be.true;
                expect(retEntity[2].userId === userId || retEntity[2].userId === userId2
                    || retEntity[2].userId === userId3).to.be.true;
                expect(retEntity[0].customerId).to.equal(customerId);
                expect(retEntity[1].customerId).to.equal(customerId);
                expect(retEntity[2].customerId).to.equal(customerId);

                retEntity = await myDAO.listUsersByCustOrg(txID, customerId, orgId3);
                expect(retEntity).to.be.an('array');
                expect(retEntity.length).to.equal(1);

                expect(retEntity[0].userId === userId3).to.be.true;
                expect(retEntity[0].customerId).to.equal(customerId);
                expect(retEntity[0].orgId).to.equal(orgId3);
            });


            it('should pass simple delete user', async () => {
                const customerId = "cust001";
                const orgId = "org001";
                const userId = "dbu01";
                const role = constants.USER_ROLES.ORG_ADMIN;
                await myDAO.addDbUser(txID, userId, customerId, orgId, { role });

                let retEntity = await myDAO.getDbUserById(txID, userId);
                expect(retEntity).to.not.be.undefined;
                expect(retEntity.userId).to.equal(userId);


                const uid = await myDAO.deleteDbUser(txID, userId);
                expect(uid).to.equal(userId);

                retEntity = await myDAO.getDbUserById(txID, userId);
                expect(retEntity.userId).to.be.undefined;

            });
        });



    });
});
