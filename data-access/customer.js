/**
 * Digital Health Pass 
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 */
const { Op } = require('sequelize');
const Logger = require('../config/logger');

const logger = new Logger('customer-dao');
const dbModels = require('../models/dbmodels');
const orgDao = require('./organization');
const dbuserDao = require('./dbuser');
const userController = require('../controllers/user');

const toApiEntity = (dbModel) => {
    if (!dbModel)
        return {};
    const { customerId, name, label, url, billingId, businessType } = dbModel;

    const apiObj = {
        customerId,
        name,
        label,
        url,
        billingId,
        businessType
    }

    return apiObj;
}

const toApiPageResults = (modelArray) => {
    // todo add start index, limit
    return modelArray.map((item) => {
        return toApiEntity(item);
    });
}

exports.addCustomer = async (txID, customer) => {
    const myName = customer.name.trim();

    const existing = await dbModels.DB.Customer.findAll({
        where: { name: myName, status: dbModels.statusEnum.active }
    });
    if (existing && existing.length > 0) {
        const err = { statusCode: 400, message: `Customer with name ${myName} already exists` };
        throw err;
    }
    try {
        // eslint-disable-next-line no-param-reassign
        customer.name = myName;
        logger.debug(`Attempt to save cust ${myName}`, txID);
        const dbModel = await dbModels.DB.Customer.create(customer);
        logger.debug(`Saved cust ${dbModel.customerId}`, txID);
        return {
            name: dbModel.name,
            customerId: dbModel.customerId
        };
    } catch (error) {
        logger.error(`Error dbOperation: ${error}`, txID);
        const err = { statusCode: 500, message: `DB Write Error: ${error.message}` };
        throw err;
    }

};

exports.getAllCustomers = async (txID) => {
    try {

        logger.debug(`GetAll customers`, txID);

        // todo remove createdAt, updatedAt, status
        const result = await dbModels.DB.Customer.findAll({
            where: { status: dbModels.statusEnum.active }
        });

        return toApiPageResults(result);
    } catch (error) {
        logger.error(`Error dbOperation: ${error}`, txID);
        const err = { statusCode: 500, message: `DB Read Error: ${error.message}` };
        throw err;
    }
}

// returns active cust 
exports.getCustomer = async (txID, customerId) => {
    try {

        logger.debug(`Get customer`, txID);

        const result = await dbModels.DB.Customer.findByPk(customerId);
        if (result && result.status === dbModels.statusEnum.inactive) {
            logger.info(`CustomerId ${customerId} is inactive`, txID);
            return {};
        }
        return toApiEntity(result);
    } catch (error) {
        logger.error(`Error dbOperation: ${error}`, txID);
        const err = { statusCode: 500, message: `DB Read Error: ${error.message}` };
        throw err;
    }
}


exports.deleteCustomer = async (txID, token, customerId) => {

    const ret = await dbModels.DB.Customer.findByPk(customerId);
    if (!ret) {
        const err = { statusCode: 404, message: `Customer not found ${customerId}` };
        throw err;
    }
    if (ret.status === dbModels.statusEnum.inactive) {
        logger.info(`CustomerId ${customerId} is inactive`, txID);
        return '';
    }
    const txn = await dbModels.DB.sequelize.transaction();
    try {
        logger.debug(`Delete customer ${customerId}`, txID);
        const userList = await dbuserDao.listUsersByCustOrg(txID, customerId);
        const deleted = [];
        for (let index = 0; index < userList.length; index += 1) {
            deleted.push(userController.deleteUser(txID, userList[index].userId));
        }
        await Promise.all(deleted);
        logger.debug(`Deleted cust user count ${userList.length}`, txID);

        await orgDao.deleteOrganizationsForCustomer(txID, token, customerId);

        ret.status = dbModels.statusEnum.inactive;
        await ret.save();

        await txn.commit();
        return customerId;
    } catch (error) {
        logger.error(`Error dbOperation: ${error}`, txID);
        await txn.rollback();
        const err = { statusCode: 500, message: `Delete Error from DB` };
        throw err;
    }
}

exports.updateCustomer = async (txID, customerId, customer) => {

    logger.debug(`Update customerId ${customerId}`, txID);

    const dbModel = await dbModels.DB.Customer.findByPk(customerId);
    if (!dbModel) {
        const err = { statusCode: 404, message: `Customer not found ${customerId}` };
        throw err;
    }
    if (dbModel && dbModel.status === dbModels.statusEnum.inactive) {
        const err = { statusCode: 400, message: `Customer ${customerId} cannot be updated since deleted` };
        throw err;
    }

    if (customer.name) {
        const myName = customer.name.trim();
        const existing = await dbModels.DB.Customer.findAll({
            where: {
                customerId: { [Op.ne]: customerId },
                name: myName,
                status: dbModels.statusEnum.active
            }
        });
        if (existing && existing.length > 0) {
            const err = { statusCode: 400, message: `Another Customer with name ${myName} already exists` };
            throw err;
        }
        // eslint-disable-next-line no-param-reassign
        dbModel.name = myName;
    }

    try {
        if (customer.label) dbModel.label = customer.label;
        if (customer.url) dbModel.url = customer.url;
        if (customer.billingId) dbModel.billingId = customer.billingId;
        if (customer.businessType) dbModel.businessType = customer.businessType;

        logger.debug(`Attempt to update cust: ${dbModel.customerId}`, txID);
        await dbModel.save();
        return {
            name: dbModel.name,
            customerId: dbModel.customerId
        };
    } catch (error) {
        logger.error(`Error dbOperation: ${error}`, txID);
        const err = { statusCode: 500, message: `DB Write Error: ${error.message}` };
        throw err;
    }

};

