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
const myDAO = require('../../../data-access/customer');

// eslint-disable-next-line max-lines-per-function
describe('test-crud-customer', () => {
    before(async () => {
        await testDBModels.init(true, sequelize);

    });

    // eslint-disable-next-line max-lines-per-function
    describe('CRUD Customer data', () => {
        const txID = "testing";

        const seedCustomerData = () => {
            const customer = {
                name: 'kayak inc',
                label: 'testlabel',
                url: 'http://paddle.it',
                businessType: 'Consumer',
            };
            return customer;
        }

        describe('addCustomer simple', () => {
            beforeEach(async () => {
                const forceSync = true; // clean db
                await testDBModels.DB.sequelize.sync({ force: forceSync });
            });

            it('should pass with expected values', async () => {
                const customer = seedCustomerData();
                const retDbData = await myDAO.addCustomer(txID, customer);

                expect(retDbData).to.not.be.empty;
                expect(retDbData).to.have.property('name');
                expect(retDbData.name).to.equal(customer.name);

                const retEntity = await myDAO.getCustomer(txID, retDbData.customerId);
                expect(retEntity).to.not.be.undefined;
                expect(retEntity.name).to.equal(customer.name);
                expect(retEntity.url).to.equal(customer.url);
                expect(retEntity.customerId).to.equal(retDbData.customerId);
                expect(retEntity.url).to.equal(customer.url);
                expect(retEntity.label).to.equal(customer.label);
                expect(retEntity.businessType).to.equal(customer.businessType);
            });

            it('should not allow duplicate name', async () => {
                const customer = seedCustomerData();
                const retDbData = await myDAO.addCustomer(txID, customer);

                expect(retDbData.name).to.equal(customer.name);
                try {
                    await myDAO.addCustomer(txID, customer);
                    assert.fail('expected exception : customer with same name not allowed');
                } catch (err) { // expected
                    expect(err.message).to.contain('already exists');
                }

                const retAllCust = await myDAO.getAllCustomers(txID);
                expect(retAllCust).to.not.be.empty;
                expect(retAllCust).to.have.length(1);
                expect(retAllCust[0].name).to.equal(customer.name);
                expect(retAllCust[0].customerId).to.be.equal(retDbData.customerId);
            });

        });

        describe('add multiple Customers', () => {
            beforeEach(async () => {
                const forceSync = true; // clean db
                await testDBModels.DB.sequelize.sync({ force: forceSync });
            });

            it('get multiple Customers via GetAll', async () => {

                const cust1 = seedCustomerData();
                cust1.name = "Outpost Inc";
                const cust2 = seedCustomerData();
                await myDAO.addCustomer(txID, cust1);
                await myDAO.addCustomer(txID, cust2);

                const retAllCust = await myDAO.getAllCustomers(txID);
                expect(retAllCust).to.not.be.empty;
                expect(retAllCust).to.have.length(2);
                expect(retAllCust[0].name).to.equal(cust1.name);
                expect(retAllCust[0].customerId).to.be.not.empty;
                expect(retAllCust[1].name).to.equal(cust2.name);
                expect(retAllCust[0].customerId).to.be.not.empty;
            });
        });

        describe('delete Customer', () => {
            beforeEach(async () => {
                const forceSync = true; // clean db
                await testDBModels.DB.sequelize.sync({ force: forceSync });
            });

            it('delete Customer ', async () => {
                const token = "MyToken";
                const cust1 = seedCustomerData();
                const customerRet = await myDAO.addCustomer(txID, cust1);

                const retCust = await myDAO.getCustomer(txID, customerRet.customerId);
                expect(retCust).to.not.be.undefined;
                expect(retCust.name).to.be.equal(cust1.name);

                // delete cust
                await myDAO.deleteCustomer(txID, token, customerRet.customerId);

                const retCust2 = await myDAO.getCustomer(txID, customerRet.customerId);
                expect(retCust2).to.not.be.undefined;
                expect(retCust2.name).to.be.undefined;
            });

            it('does not get inactive Customers via GetAll', async () => {
                const token = "MyToken";
                const cust1 = seedCustomerData();
                const cust2 = seedCustomerData();
                cust2.name = "Outpost Inc";
                const cust3 = seedCustomerData();
                cust3.name = "Inseason Inc";
                await myDAO.addCustomer(txID, cust1);
                const customerRet2 = await myDAO.addCustomer(txID, cust2);
                await myDAO.addCustomer(txID, cust3)
                let retAllCust = await myDAO.getAllCustomers(txID);
                expect(retAllCust).to.not.be.empty;
                expect(retAllCust).to.have.length(3);

                // delete cust2
                await myDAO.deleteCustomer(txID, token, customerRet2.customerId);

                retAllCust = await myDAO.getAllCustomers(txID);
                expect(retAllCust).to.not.be.empty;
                expect(retAllCust).to.have.length(2);
                expect(retAllCust[0].name).to.equal(cust1.name);
                expect(retAllCust[0].customerId).to.be.not.empty;
                expect(retAllCust[1].name).to.equal(cust3.name);
                expect(retAllCust[1].customerId).to.be.not.empty;
            });
        });

        describe('update Customer', () => {
            beforeEach(async () => {
                const forceSync = true; // clean db
                await testDBModels.DB.sequelize.sync({ force: forceSync });
            });

            it('simple update Customer', async () => {
                const cust1 = seedCustomerData();
                const customerRet = await myDAO.addCustomer(txID, cust1);

                const retCust = await myDAO.getCustomer(txID, customerRet.customerId);
                expect(retCust).to.not.be.undefined;
                expect(retCust.name).to.be.equal(cust1.name);

                // update 
                cust1.name = 'newName';
                cust1.label = 'updatedLabel';
                cust1.url = 'http://newurl.it';
                await myDAO.updateCustomer(txID, customerRet.customerId, cust1);

                const retCust2 = await myDAO.getCustomer(txID, customerRet.customerId);
                expect(retCust2).to.not.be.undefined;
                expect(retCust2.name).to.equal(cust1.name);
                expect(retCust2.label).to.equal(cust1.label);
                expect(retCust2.url).to.equal(cust1.url);
            });

            it('update Customer should fail  nonexistent', async () => {
                const cust1 = seedCustomerData();
                // update 
                cust1.label = 'updatedLabel';
                try {
                    await myDAO.updateCustomer(txID, "noCustomer", cust1);
                    assert.fail('expected exception');
                } catch (err) { // expected
                    expect(err.statusCode).to.equal(404);
                }

            });

            it('update Customer should fail on same name as a existing cust', async () => {
                const cust1 = seedCustomerData();
                cust1.name = "Outpost Inc";
                await myDAO.addCustomer(txID, cust1);

                const cust2 = seedCustomerData();
                const customerRet = await myDAO.addCustomer(txID, cust2);

                const retCust = await myDAO.getCustomer(txID, customerRet.customerId);
                expect(retCust).to.not.be.undefined;
                expect(retCust.name).to.be.equal(cust2.name);

                // update 
                cust2.name = cust1.name;
                try {
                    await myDAO.updateCustomer(txID, customerRet.customerId, cust2);
                    assert.fail('expected exception : cust with same name not allowed');
                } catch (err) { // expected
                    expect(err.message).to.contain('already exists');
                }

                cust2.name = '';
                await myDAO.updateCustomer(txID, customerRet.customerId, cust2);
                const retCust2 = await myDAO.getCustomer(txID, customerRet.customerId);
                expect(retCust2).to.not.be.undefined;
                expect(retCust2.label).to.equal(cust2.label);
                expect(retCust2.url).to.equal(cust2.url);
            });

        });

    });
});
