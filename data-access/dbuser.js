/**
 * Digital Health Pass 
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 */

const Logger = require('../config/logger');
const constants = require('../helpers/constants');

const logger = new Logger('dbuser-dao');
const dbModels = require('../models/dbmodels');
const custDao = require('./customer');
const orgDao = require('./organization');

// eslint-disable-next-line complexity,
exports.addDbUser = async (txID, userId, userCustomerId, userOrgId, userMetadata) => {
    // validate userId
    if (!userId) {
        const errMsg = `Invalid userId: ${userId}`;
        const err = { statusCode: 400, message: errMsg };
        throw err;
    }

    // todo validate customerId & ordId before onboard to Appid
    logger.info(`Adding user to db ${userId}`, txID);

    const { role } = userMetadata;
    let orgId = userOrgId || '';
    let customerId = userCustomerId || '';
    // user role assignment
    if (role === constants.USER_ROLES.SYSTEM_ADMIN) {
        orgId = constants.WILDCARD_USER_AUTHORIZE;
        customerId = constants.WILDCARD_USER_AUTHORIZE;
    }
    else if (role === constants.USER_ROLES.CUSTOMER_ADMIN) {
        orgId = constants.WILDCARD_USER_AUTHORIZE;
        if (!userCustomerId) {
            const errMsg = `customerId must be specified`;
            const err = { statusCode: 400, message: errMsg };
            throw err;
        }
    }
    else if (role === constants.USER_ROLES.ORG_ADMIN) {
        logger.debug(`User role: org admin`, txID);
        if ((!userCustomerId || !userOrgId)) {
            const errMsg = `customerId and organizationId must be specified`;
            const err = { statusCode: 400, message: errMsg };
            throw err;
        }
    }
    else {
        const errMsg = `Invalid User Role: ${role}`;
        const err = { statusCode: 400, message: errMsg };
        throw err;
    }


    try {
        const user = {
            customerId,
            orgId,
            userId,
            role
        };
        const existing = await dbModels.DB.User.findByPk(userId);
        if (existing && existing.userId) {
            const err = { statusCode: 400, message: 'User with the id already exists.' };
            throw err;
        }
        else if (!existing || !existing.userId) {  // No update supported            
            const dbModel = await dbModels.DB.User.create(user);
            logger.debug(`Created new user ${dbModel.userId}`, txID);
        }
        else {
            logger.debug(`User already exist: ${userId}`, txID);
        }

        return {
            userId,
            customerId,
            orgId,
            role
        };
    } catch (error) {
        logger.error(`Error dbOperation: ${error}`, txID);
        const err = { statusCode: 500, message: `DB Write Error: ${error.message}` };
        throw err;
    }

};

// returns the raw model object
exports.getDbUserById = async (txID, userId) => {
    try {
        if (!userId)
            return {};
        logger.debug(`Get dbuser ${userId}`, txID);

        const result = await dbModels.DB.User.findByPk(userId);
        if (!result || !result.userId)
            return {};

        return result; // if we need to expose it via api, write another func to use toApiModel()
    } catch (error) {
        logger.error(`Error dbOperation: ${error}`, txID);
        const err = { statusCode: 500, message: `DB Read Error: ${error.message}` };
        throw err;
    }
}

exports.deleteDbUser = async (txID, userId) => {
    try {
        if (!userId)
            return {};
        logger.debug(`Deleting dbuser ${userId}`, txID);

        const result = await dbModels.DB.User.findByPk(userId);
        if (!result)
            return {};

        await result.destroy();
        return userId;
    } catch (error) {
        logger.error(`Error dbOperation: ${error}`, txID);
        const err = { statusCode: 500, message: `DB delete Error: ${error.message}` };
        throw err;
    }
}

const toApiEntity = (dbModel) => {
    if (!dbModel)
        return {};
    const { userId, customerId, orgId, role } = dbModel;
    let orgIdAttribute; let customerIdAttribute;

    if (orgId !== constants.WILDCARD_USER_AUTHORIZE)
        orgIdAttribute = orgId;
    if (customerId !== constants.WILDCARD_USER_AUTHORIZE)
        customerIdAttribute = customerId;
    return {
        userId,
        role,
        customerId: customerIdAttribute,
        orgId: orgIdAttribute,
    }
}
exports.listUsersByCustOrg = async (txID, customerId, organizationId) => {
    try {
        if (!customerId && !organizationId) {
            const errMsg = `Invalid input: customerId or organizationId must be specified`;
            const err = { statusCode: 400, message: errMsg };
            throw err;
        }

        logger.debug(`List dbuser cust:${customerId} org:${organizationId}`, txID);

        const whereClause = {}
        if (customerId)
            whereClause.customerId = customerId;
        if (organizationId)
            whereClause.orgId = organizationId;

        const result = await dbModels.DB.User.findAll({
            where: whereClause
        });

        const userList = result.map((user) => {
            return toApiEntity(user);
        });

        return userList;
    } catch (error) {
        logger.error(`Error dbOperation: ${error}`, txID);
        const err = { statusCode: 500, message: `DB Read Error: ${error.message}` };
        throw err;
    }
}

// eslint-disable-next-line complexity,
exports.validateCustomerOrgIdForUser = async (txID, customerId, organizationId, role) => {
    logger.debug(`validateCustomerOrgId`, txID);
    let errMsg = '';
    if (role !== constants.USER_ROLES.SYSTEM_ADMIN && !customerId && !organizationId) {
        errMsg = `customerId / organizationId must be specified`;
    }
    else if (role === constants.USER_ROLES.CUSTOMER_ADMIN && !customerId) {
        errMsg = `customerId must be specified`;
    }
    else if (role === constants.USER_ROLES.ORG_ADMIN && (!customerId || !organizationId)) {
        errMsg = `customerId and organizationId must be specified`;
    }

    if (!errMsg) {
        if (customerId) {
            const retCust = await custDao.getCustomer(txID, customerId);
            if (!retCust || !retCust.customerId) {
                errMsg = `Invalid Customer: ${customerId}`;
            }
        }
        if (organizationId) {
            const retOrg = await orgDao.getOrganization(txID, customerId, organizationId);
            if (!retOrg || !retOrg.orgId)
                errMsg = `Invalid Organization: ${organizationId}`;
        }
    }

    if (errMsg) {
        const err = { statusCode: 404, message: errMsg };
        throw err;
    }
}
