/**
 * Digital Health Pass 
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 */
const { Op } = require('sequelize');
const Logger = require('../config/logger');

const logger = new Logger('organization-dao');
const dbModels = require('../models/dbmodels');
const custDao = require('./customer');
const dbuserDao = require('./dbuser');
const verifierDao = require('./verifier');
const userController = require('../controllers/user');


exports.addOrganization = async (txID, customerId, apiOrg) => {
    const myName = apiOrg.name.trim();

    logger.debug(`Validation cust for the organization ${myName}`, txID);
    const retCust = await custDao.getCustomer(txID, customerId);

    if (!retCust || !retCust.customerId) {
        const errMsg = `Invalid Customer: ${customerId}`;
        const err = { statusCode: 404, message: errMsg };
        throw err;
    }

    const existing = await dbModels.DB.Organization.findAll({
        where: { customerId, name: myName, status: dbModels.statusEnum.active }
    });
    if (existing && existing.length > 0) {
        const err = { statusCode: 400, message: `Organization with name ${myName} already exists` };
        throw err;
    }


    try {
        const org = { ...apiOrg };
        org.name = myName;
        if (apiOrg.numberOfEmployees) {
            org.minEmployees = apiOrg.numberOfEmployees.minValue;
            org.maxEmployees = apiOrg.numberOfEmployees.maxValue;
            delete org.numberOfEmployees;
        }
        org.customerId = customerId;

        logger.debug(`Attempt save org ${org.name}`, txID);
        const newOrg = dbModels.DB.Organization.build(org);
        const dbModel = await newOrg.save();
        logger.info(`Saved org ${dbModel.orgId}`, txID);
        // use Special methods/mixins
        if (org.address) {
            await newOrg.createAddress(org.address);
            logger.debug(`Saved address`, txID);
        }
        return {
            orgId: newOrg.orgId,
            name: newOrg.name,
            customerId
        };
    } catch (error) {
        logger.error(`Error dbOperation: ${error}`, txID);
        const err = { statusCode: 500, message: `DB Write Error: ${error.message}` };
        throw err;
    }

};
// eslint-disable-next-line complexity
exports.updateOrganization = async (txID, customerId, orgId, orgUpdated) => {

    logger.debug(`Update orgId ${orgId}, customerId ${customerId}`, txID);
    const retCust = await custDao.getCustomer(txID, customerId);

    if (!retCust || !retCust.customerId) {
        const errMsg = `Invalid Customer: ${customerId}`;

        const err = { statusCode: 404, message: errMsg };
        throw err;
    }
    const dbModel = await dbModels.DB.Organization.findByPk(
        orgId,
        { include: dbModels.DB.Address });
    if (!dbModel) {
        const err = { statusCode: 404, message: `Organization not found for CustomerId: ${customerId}` };
        throw err;
    }
    if (dbModel && dbModel.status === dbModels.statusEnum.inactive) {
        const err = { statusCode: 400, message: `Organization ${orgId} cannot be updated since deleted` };
        throw err;
    }

    if (orgUpdated.name) {
        const myName = orgUpdated.name.trim();
        const existing = await dbModels.DB.Organization.findAll({
            where: {
                orgId: { [Op.ne]: orgId },
                name: myName,
                customerId,
                status: dbModels.statusEnum.active
            }
        });
        if (existing && existing.length > 0) {
            const err = { statusCode: 400, message: `Another Organization with name ${myName} already exists` };
            throw err;
        }
        dbModel.name = myName;
    }

    try {
        if (orgUpdated.label) dbModel.label = orgUpdated.label;
        if (orgUpdated.url) dbModel.url = orgUpdated.url;
        if (orgUpdated.address) {
            const { street, locality, postalCode, region, country } = orgUpdated.address;

            if (dbModel.Address) {
                const newAddress = dbModel.Address;
                if (street) newAddress.street = street;
                if (locality) newAddress.locality = locality;
                if (postalCode) newAddress.postalCode = postalCode;
                if (region) newAddress.region = region;
                if (country) newAddress.country = country;
                logger.debug(`Saving updated address`, txID);
                await newAddress.save();
            }
            else {
                logger.debug(`Saving new address`, txID);
                await dbModel.createAddress(orgUpdated.address);
            }
        }

        logger.debug(`Attempt to update orgId: ${dbModel.orgId}`, txID);
        await dbModel.save();
        return {
            name: dbModel.name,
            orgId: dbModel.orgId,
            customerId
        };
    } catch (error) {
        logger.error(`Error dbOperation: ${error}`, txID);
        const err = { statusCode: 500, message: `DB Write Error: ${error.message}` };
        throw err;
    }

};

const toApiEntity = (dbModel) => {
    if (!dbModel)
        return {};
    const { orgId, customerId, name, label, url, minEmployees, maxEmployees } = dbModel;

    const apiObj = {
        orgId,
        customerId,
        name,
        label,
        url,
        numberOfEmployees: {
            minValue: minEmployees,
            maxValue: maxEmployees
        },
    }
    if (dbModel.Address) {
        const { street, locality, postalCode, region, country } = dbModel.Address;
        apiObj.address = {
            street,
            locality,
            postalCode,
            region,
            country
        }
    }
    return apiObj;
}
const toApiPageResults = (modelArray) => {
    // todo add start index, limit
    return modelArray.map((item) => {
        return toApiEntity(item);
    });
}

exports.getAllOrganizations = async (txID, customerId) => {

    logger.debug(`GetAll Organizations`, txID);
    const retCust = await custDao.getCustomer(txID, customerId);

    if (!retCust || !retCust.customerId) {
        const errMsg = `Invalid Customer: ${customerId}`;
        const err = { statusCode: 404, message: errMsg };
        throw err;
    }
    try {
        // todo pagination { offset: 5, limit: 5 }
        const result = await dbModels.DB.Organization.findAll({
            attributes: ['orgId', 'name', 'label', 'status', 'customerId', 'url', 'minEmployees', 'maxEmployees'],
            where: { customerId, status: dbModels.statusEnum.active },
            include: dbModels.DB.Address
        });


        return toApiPageResults(result);
    } catch (error) {
        logger.error(`Error dbOperation: ${error}`, txID);
        const err = { statusCode: 500, message: `DB Read Error: ${error.message}` };
        throw err;
    }
}

// returns active org , for Valid Customer
exports.getOrganization = async (txID, customerId, organizationId) => {
    logger.debug(`Get Organization`, txID);
    const retCust = await custDao.getCustomer(txID, customerId);

    if (!retCust || !retCust.customerId) {
        const errMsg = `Invalid Customer: ${customerId}`;

        const err = { statusCode: 404, message: errMsg };
        throw err;
    }
    try {
        const result = await dbModels.DB.Organization.findByPk(
            organizationId,
            { include: dbModels.DB.Address });

        if (result && result.status === dbModels.statusEnum.inactive) {
            logger.info(`OrgId ${organizationId} is inactive`, txID);
            return {};
        }
        return toApiEntity(result);
    } catch (error) {
        logger.error(`Error dbOperation: ${error}`, txID);
        const err = { statusCode: 500, message: `DB Read Error: ${error.message}` };
        throw err;
    }
}

// Validates existence of Org, throws only DB read errors
exports.validateOrganization = async (txID, organizationId) => {

    let isActive = false;
    let ret = {};
    const result = await dbModels.DB.Organization.findByPk(
        organizationId,
        {
            attributes: ['orgId', 'name', 'label', 'status', 'customerId'],
        }
    );

    if (result && result.status === dbModels.statusEnum.active) {
        isActive = true;
        ret = toApiEntity(result);
    }
    logger.debug(`Organization ${organizationId} isActive: ${isActive}`, txID);
    return ret;
}


exports.deleteOrganization = async (txID, token, customerId, organizationId) => {
    logger.debug(`Validation cust for the organization ${organizationId}`, txID);
    const retCust = await custDao.getCustomer(txID, customerId);

    if (!retCust || !retCust.customerId) {
        const errMsg = `Invalid Customer: ${customerId}`;

        const err = { statusCode: 404, message: errMsg };
        throw err;
    }

    const ret = await dbModels.DB.Organization.findByPk(organizationId);
    if (!ret) {
        const err = { statusCode: 404, message: `Not found` };
        throw err;
    }
    try {
        const verList = await verifierDao.getAllVerifier(txID, organizationId);
        for (let i = 0; i < verList.length; i += 1) {
            const retVerifier = verList[i];
            if (retVerifier.status === dbModels.verifierStatusEnum.active) {
                // eslint-disable-next-line no-await-in-loop
                const vid = await verifierDao.revokeVerifier(txID, token, organizationId, retVerifier.verifierId);
                logger.info(`Revoked cred for Org: ${organizationId}, verifierId: ${vid}`, txID);
            }
        }
    } catch (error) {
        logger.error(`Error revoking verifiers in the Org: ${organizationId}, ${error}`, txID);
        const err = { statusCode: 500, message: `Error during Revoke verifiers operation` };
        throw err;
    }

    try {
        const userList = await dbuserDao.listUsersByCustOrg(txID, customerId, organizationId);
        const deleted = [];
        for (let index = 0; index < userList.length; index += 1) {
            deleted.push(userController.deleteUser(txID, userList[index].userId));
        }
        await Promise.all(deleted);
        logger.debug(`Deleted Org user count ${userList.length}`, txID);

        logger.info(`Delete Organization ${organizationId}`, txID);
        ret.status = dbModels.statusEnum.inactive;
        await ret.save();
        return organizationId;
    } catch (error) {
        logger.error(`Error during deleteUser or deleteOrg: ${error}`, txID);
        const err = { statusCode: 500, message: `Error during Delete operation` };
        throw err;
    }
}

// Used by internal function deleteCustomer
exports.deleteOrganizationsForCustomer = async (txID, token, customerId) => {

    logger.debug(`deleteOrganizationsForCustomer Organizations`, txID);
    try {
        const result = await dbModels.DB.Organization.findAll({
            attributes: ['orgId', 'name', 'customerId', 'status'],
            where: { customerId, status: dbModels.statusEnum.active },
        });

        for (let i = 0; i < result.length; i += 1) {
            const element = result[i];
            logger.info(`Delete OrgForCustomer ${element.orgId}`, txID);
            // eslint-disable-next-line no-await-in-loop
            await this.deleteOrganization(txID, token, customerId, element.orgId);
        }

        return customerId;
    } catch (error) {
        logger.error(`Error dbOperation: ${error}`, txID);
        const err = { statusCode: 500, message: `DB Read Error: ${error.message}` };
        throw err;
    }
}

