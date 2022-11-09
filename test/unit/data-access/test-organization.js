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

const sequelize = new Sequelize('sqlite::memory:');
const custDAO = require('../../../data-access/customer');
const myDAO = require('../../../data-access/organization');
const Logger = require('../../../config/logger');

const logger = new Logger('test-org');


// eslint-disable-next-line max-lines-per-function
describe('test-crud-org', () => {
    before(async () => {
        process.env.POSTGRES_DB_NAME = "test_verifierdb";
        await testDBModels.init(true, sequelize);

    });

    // eslint-disable-next-line max-lines-per-function
    describe('Organization data access', () => {
        const txID = "testing";

        const addSeedCustomer = async () => {
            const customer = {
                name: 'kayak inc',
                label: 'testlabel',
                url: 'http://paddle.it',
                businessType: 'Retail',
            };

            // add cust
            const retDbData = await custDAO.addCustomer(txID, customer);

            expect(retDbData).to.not.be.undefined;
            expect(retDbData.customerId).to.not.be.undefined;
            expect(retDbData.name).to.equal(customer.name);
            return retDbData;
        }

        const createTestOrg1Data = () => {
            const org1 = {
                "name": "unitOrg1",
                "label": "OrganizationOne Inc.",
                "url": "http://org.test",
                "numberOfEmployees": {
                    "minValue": "0",
                    "maxValue": "100"
                },
                "address": {
                    "street": "123 main st",
                    "locality": "BOS",
                    "region": "NE",
                    "postalCode": "02421",
                    "country": "US"
                }
            }
            return org1;
        };

        describe('add and retrieve Organization: simple', () => {
            beforeEach(async () => {
                const forceSync = true; // clean db
                await testDBModels.DB.sequelize.sync({ force: forceSync });
            });

            it('should add with all expected input', async () => {
                const customerRet = await addSeedCustomer();
                const org1 = createTestOrg1Data();


                const retDbData = await myDAO.addOrganization(txID, customerRet.customerId, org1);

                expect(retDbData).to.not.be.undefined;
                expect(retDbData).to.have.property('orgId');

                expect(retDbData.name).to.equal(org1.name);
                expect(retDbData.customerId).to.equal(customerRet.customerId);

                const retEntity = await myDAO.getOrganization(txID, customerRet.customerId, retDbData.orgId);
                expect(retEntity).to.not.be.undefined;
                expect(retEntity.name).to.equal(org1.name);
                logger.info(`retEntity ${JSON.stringify(retEntity)}`);
                // console.log(`\ntest retDbData ${JSON.stringify(retDbData)}`);
                // console.log(`\nmy org1 ${JSON.stringify(org1)}`);

                expect(retEntity).to.have.property('orgId');
                expect(retEntity.url).to.equal(org1.url);
                expect(retEntity.label).to.equal(org1.label);
                expect(retEntity.customerId).to.equal(customerRet.customerId);
                expect(retEntity.numberOfEmployees).to.be.not.undefined;
                expect(retEntity.numberOfEmployees.minValue).to.equal(org1.numberOfEmployees.minValue);
                expect(retEntity.numberOfEmployees.maxValue).to.equal(org1.numberOfEmployees.maxValue);

                expect(retEntity.address).to.be.not.undefined;
                expect(retEntity.address.street).to.equal(org1.address.street);
                expect(retEntity.address.postalCode).to.equal(org1.address.postalCode);
                expect(retEntity.address.region).to.equal(org1.address.region);
                expect(retEntity.address.country).to.equal(org1.address.country);
                expect(retEntity.address.locality).to.equal(org1.address.locality);
            });

            it('should retieve all orgs for a customer', async () => {
                const customerRet = await addSeedCustomer();
                const org1 = createTestOrg1Data();
                const addData = await myDAO.addOrganization(txID, customerRet.customerId, org1);
                expect(addData).to.have.property('orgId');

                const retDbData = await myDAO.getAllOrganizations(txID, customerRet.customerId);
                expect(retDbData).to.not.be.undefined;
                expect(retDbData).to.have.length(1);
                const retEntity = retDbData[0];
                expect(retEntity.name).to.equal(org1.name);

                expect(retEntity).to.have.property('orgId');
                expect(retEntity.url).to.equal(org1.url);
                expect(retEntity.customerId).to.equal(customerRet.customerId);
                expect(retEntity.numberOfEmployees).to.be.not.undefined;
                expect(retEntity.numberOfEmployees.minValue).to.equal(org1.numberOfEmployees.minValue);
                expect(retEntity.numberOfEmployees.maxValue).to.equal(org1.numberOfEmployees.maxValue);

                expect(retEntity.address).to.be.not.undefined;
                expect(retEntity.address.street).to.equal(org1.address.street);
                expect(retEntity.address.postalCode).to.equal(org1.address.postalCode);
                expect(retEntity.address.country).to.equal(org1.address.country);

            });

            it('should not allow Org with duplicate name', async () => {
                const customerRet = await addSeedCustomer()
                const org1 = createTestOrg1Data();
                const addData = await myDAO.addOrganization(txID, customerRet.customerId, org1);
                expect(addData).to.have.property('orgId');

                try {
                    await myDAO.addOrganization(txID, customerRet.customerId, org1);
                    assert.fail('expected exception : org with same name not allowed');
                } catch (err) { // expected
                    expect(err.message).to.contain('already exists');
                }
                const retOrg = await myDAO.getOrganization(txID, customerRet.customerId, addData.orgId);
                expect(retOrg).to.not.be.undefined;
                expect(retOrg.label).to.equal(org1.label);
                expect(retOrg.name).to.equal(org1.name);
                expect(retOrg.customerId).to.be.equal(customerRet.customerId);
            });

        });

        describe('delete Organization', () => {
            beforeEach(async () => {
                const forceSync = true; // clean db
                await testDBModels.DB.sequelize.sync({ force: forceSync });
            });

            it('should delete Org by orgId', async () => {
                const token = "testToken";

                const customerRet = await addSeedCustomer()
                const org1 = createTestOrg1Data();
                const addData = await myDAO.addOrganization(txID, customerRet.customerId, org1);
                expect(addData).to.have.property('orgId');

                const retEntity = await myDAO.getOrganization(txID, customerRet.customerId, addData.orgId);
                expect(retEntity).to.not.be.undefined;
                expect(retEntity.name).to.equal(org1.name);

                const retOrgId = await myDAO.deleteOrganization(txID, token, customerRet.customerId, addData.orgId);
                expect(retOrgId).to.equal(addData.orgId);

                const retEntity2 = await myDAO.getOrganization(txID, customerRet.customerId, addData.orgId);
                expect(retEntity2).to.be.not.undefined;
                expect(retEntity2.orgId).to.be.undefined;

            });
        });

        describe('update Organization', () => {
            beforeEach(async () => {
                const forceSync = true; // clean db
                await testDBModels.DB.sequelize.sync({ force: forceSync });
            });

            it('update an Organization', async () => {
                const customerRet = await addSeedCustomer()
                const org1 = createTestOrg1Data();
                const addData = await myDAO.addOrganization(txID, customerRet.customerId, org1);
                expect(addData).to.have.property('orgId');

                const retEntity = await myDAO.getOrganization(txID, customerRet.customerId, addData.orgId);
                expect(retEntity).to.not.be.undefined;
                expect(retEntity.name).to.equal(org1.name);


                // update 
                const update1Org = {
                    "name": "newOrg1",
                    "label": "updatedOrgLabel",
                    "url": "http://newurl.it"
                }
                await myDAO.updateOrganization(txID, customerRet.customerId, addData.orgId, update1Org);
                let retEntity2 = await myDAO.getOrganization(txID, customerRet.customerId, addData.orgId);
                expect(retEntity2).to.not.be.undefined;
                expect(retEntity2.name).to.equal(update1Org.name);

                expect(retEntity2.label).to.equal(update1Org.label);
                expect(retEntity2.url).to.equal(update1Org.url);
                expect(retEntity2.address.street).to.equal(org1.address.street);
                expect(retEntity2.address.region).to.equal(org1.address.region);
                expect(retEntity2.address.postalCode).to.equal(org1.address.postalCode);

                // update again
                const update2Org = {
                    "label": "updatedOrgLabel2",
                    "address": {
                        "street": "456 main st",
                        "postalCode": "02484"
                    }
                }
                await myDAO.updateOrganization(txID, customerRet.customerId, addData.orgId, update2Org);

                retEntity2 = await myDAO.getOrganization(txID, customerRet.customerId, addData.orgId);

                expect(retEntity2).to.not.be.undefined;
                expect(retEntity2.name).to.equal(update1Org.name);
                expect(retEntity2.label).to.equal(update2Org.label);

                expect(retEntity2.address.street).to.equal(update2Org.address.street);
                expect(retEntity2.address.postalCode).to.equal(update2Org.address.postalCode);
                expect(retEntity2.address.region).to.equal(org1.address.region);
                expect(retEntity2.address.locality).to.equal(org1.address.locality);
                expect(retEntity2.address.country).to.equal(org1.address.country);
            });

            it('should not allow update Org with duplicate name', async () => {
                const customerRet = await addSeedCustomer()
                const org1 = createTestOrg1Data();
                const org2 = createTestOrg1Data();
                org2.name = "unitUpdateOrg2";

                let addData = await myDAO.addOrganization(txID, customerRet.customerId, org2);
                expect(addData).to.have.property('orgId');

                addData = await myDAO.addOrganization(txID, customerRet.customerId, org1);
                expect(addData).to.have.property('orgId');

                try {
                    const updateData = {
                        "name": org2.name
                    }
                    await myDAO.updateOrganization(txID, customerRet.customerId, addData.orgId, updateData);
                    assert.fail('expected exception : Org update with same name not allowed');
                } catch (err) { // expected
                    expect(err.message).to.contain('already exists');
                }

                const retOrg = await myDAO.getOrganization(txID, customerRet.customerId, addData.orgId);
                expect(retOrg).to.not.be.undefined;
                expect(retOrg.label).to.equal(org1.label);
                expect(retOrg.name).to.equal(org1.name);
            });

        });
    });
});
