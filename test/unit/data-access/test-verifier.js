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
const sinon = require('sinon');
const testDBModels = require('../../../models/dbmodels');

const sequelize = new Sequelize('sqlite::memory:');
const custDAO = require('../../../data-access/customer');
const orgDAO = require('../../../data-access/organization');
const myDAO = require('../../../data-access/verifier');
const credentialHelper = require('../../../helpers/credential-helper');

// eslint-disable-next-line max-lines-per-function
describe('test-crud-verifier', () => {
    before(async () => {
        process.env.POSTGRES_DB_NAME = "test_verifierdb";
        await testDBModels.init(true, sequelize);

    });

    const sandbox = sinon.createSandbox();
    // eslint-disable-next-line max-lines-per-function
    describe('Verifier api', () => {
        const txID = "testing";


        const addSeedCustomer = async () => {
            const customer = {
                name: 'verTestCust Inc',
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

        const addSeedOrganization = async (customerId) => {
            const org1 = {
                "name": "verTestOrg1",
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

            const retDbData = await orgDAO.addOrganization(txID, customerId, org1);

            expect(retDbData).to.not.be.undefined;
            expect(retDbData).to.have.property('orgId');
            return retDbData;
        };

        const getSampleVerifier1 = () => {
            return {
                name: "Entry scan",
                label: "Gate 1 Entry",
                verifierType: "UnitTest Ver type1",
                configId: "ShcConfig:0.10",
                configName: "Simple SHC Config"
            }
        }
        const getSampleVerifier2 = () => {
            return {
                name: "Exit scan",
                label: "Gate 2 Entry",
                verifierType: "UnitTest type2",
            }
        }


        describe('add and retrieve Verifier tests', () => {
            beforeEach(async () => {
                const forceSync = true; // clean db
                await testDBModels.DB.sequelize.sync({ force: forceSync });

                // stub out the VC generation via issuer API
                const appidHelperStub = sandbox.stub(credentialHelper, "generateVerifierCredential");
                appidHelperStub.returns({});
            });

            afterEach(() => {
                // completely restore all fakes 
                sandbox.restore();
            });

            it('should add one with all expected input and get verifier', async () => {
                const customerRet = await addSeedCustomer();
                const orgRet = await addSeedOrganization(customerRet.customerId);
                const verifier1 = getSampleVerifier1();
                const { orgId } = orgRet;

                const retDbData = await myDAO.addVerifier(txID, "Bearer Token1", orgId, verifier1);

                expect(retDbData).to.not.be.undefined;
                expect(retDbData).to.have.property('verifierId');

                expect(retDbData.name).to.equal(verifier1.name);
                expect(retDbData.customerId).to.equal(customerRet.customerId);
                expect(retDbData.orgId).to.equal(orgRet.orgId);
                const verifier1Id = retDbData.verifierId;

                const retrievedVF = await myDAO.getVerifier(txID, orgId, verifier1Id);
                expect(retrievedVF).to.not.be.undefined;
                expect(retrievedVF.verifierType).to.equal(verifier1.verifierType);
                expect(retrievedVF.status).to.equal('active');
                expect(retrievedVF.name).to.equal(verifier1.name);
                expect(retrievedVF.configName).to.equal(verifier1.configName);
                expect(retrievedVF.configId).to.equal(verifier1.configId);
            });

            it('should add multiple verifiers and list them', async () => {
                const customerRet = await addSeedCustomer();
                const orgRet = await addSeedOrganization(customerRet.customerId);
                const verifier1 = getSampleVerifier1();
                const verifier2 = getSampleVerifier2();
                const { orgId } = orgRet;

                let retDbData = await myDAO.addVerifier(txID, "Bearer Token1", orgId, verifier1);
                expect(retDbData.name).to.equal(verifier1.name);
                expect(retDbData.customerId).to.equal(customerRet.customerId);
                expect(retDbData.orgId).to.equal(orgRet.orgId);
                const verifier1Id = retDbData.verifierId;

                retDbData = await myDAO.addVerifier(txID, "Bearer Token1", orgId, verifier2);

                expect(retDbData.name).to.equal(verifier2.name);
                expect(retDbData.customerId).to.equal(customerRet.customerId);
                expect(retDbData.orgId).to.equal(orgRet.orgId);
                const verifier2Id = retDbData.verifierId;


                const retrievedVF = await myDAO.getVerifier(txID, orgId, verifier1Id);
                expect(retrievedVF.verifierType).to.equal(verifier1.verifierType);
                expect(retrievedVF.status).to.equal('active');
                expect(retrievedVF.name).to.equal(verifier1.name);
                expect(retrievedVF.orgId).to.equal(orgRet.orgId);
                expect(retrievedVF.label).to.equal(verifier1.label);
                expect(retrievedVF.verifierType).to.equal(verifier1.verifierType);


                const retList = await myDAO.getAllVerifier(txID, orgId);
                expect(retList).to.not.be.undefined;
                expect(retList).to.have.length(2);
                assert(retList[0].name === verifier1.name || retList[0].name === verifier2.name);
                assert(retList[1].name === verifier1.name || retList[1].name === verifier2.name);
                assert(retList[0].verifierId === verifier1Id || retList[0].verifierId === verifier2Id);
                assert(retList[1].verifierId === verifier1Id || retList[1].verifierId === verifier2Id);
            });

        });


    });
});
