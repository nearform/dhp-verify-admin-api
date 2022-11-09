/* eslint-disable max-len */
/**
 * Digital Health Pass 
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 */

const constants = require('../helpers/constants');
const { validateReqBody, validateRequiredField, logAndSendErrorResponse } = require('../helpers/utils');
const Logger = require('../config/logger');

const logger = new Logger('admin-crud-controller');
const daoCustomer = require('../data-access/customer');
const daoOrganization = require('../data-access/organization');
const daoVerifier = require('../data-access/verifier');
/*
 * Steps:
 *  1. validate Customer data: name must be non-empty & no prior customer with same name
 *          businessType enum
        2. AppID: create scope, role. onboard Admin user in AppId : reject if data validate failed
        3. Get userId from 2 for db.custadmin.userId. 
                Save Customer , CustomerAdmin
    */
exports.addCustomer = async (req, res) => {
    const txID = req.headers[constants.REQUEST_HEADERS.TRANSACTION_ID];

    const { label, url, businessType, billingId } = req.body;
    const myName = req.body.name;
    logger.info(`POST addCustomer ${myName}`, txID);

    const errMsg = validateReqBody(txID, req.body, ['name']);
    if (errMsg) {
        return logAndSendErrorResponse(txID, res, { statusCode: 400, message: errMsg }, `addCustomer ${myName}`)
    };

    try {
        const customer = {};
        customer.name = myName;
        customer.url = url;
        customer.label = label;
        customer.businessType = businessType;
        customer.billingId = billingId;

        logger.info(`Attempting to save cust/organization ${myName}`, txID);
        const result = await daoCustomer.addCustomer(txID, customer);
        logger.response(201, `Successfully added to db: ${result.customerId}`, txID);
        return res.status(201).json({
            message: "Successfully created",
            customerId: result.customerId,
        });
    } catch (error) {
        return logAndSendErrorResponse(txID, res, { statusCode: error.statusCode, message: error.message }, 'addCustomer')
    }
};

exports.getAllCustomers = async (req, res) => {
    const txID = req.headers[constants.REQUEST_HEADERS.TRANSACTION_ID];

    try {
        logger.info(`GetAll customer`, txID);
        const result = await daoCustomer.getAllCustomers(txID);

        logger.response(200, `Success`, txID);
        return res.status(200).json({
            customers: { data: result }
        });
    } catch (error) {
        return logAndSendErrorResponse(txID, res, { statusCode: error.statusCode, message: error.message }, 'getAllCustomers')
    }
}

exports.getCustomer = async (req, res) => {
    const txID = req.headers[constants.REQUEST_HEADERS.TRANSACTION_ID];
    try {
        const customerId = req.params.custId;
        const errMsg = validateRequiredField(customerId, 'customerId');
        if (errMsg) {
            return logAndSendErrorResponse(txID, res, { statusCode: 400, message: errMsg }, 'getCustomer')
        };

        logger.info(`Get Customer ${customerId}`, txID);

        const customer = await daoCustomer.getCustomer(txID, customerId);
        logger.response(200, `Success`, txID);
        return res.status(200).json({
            customer
        });
    } catch (error) {
        return logAndSendErrorResponse(txID, res, { statusCode: error.statusCode, message: error.message }, 'getCustomer')
    }
}

exports.deleteCustomer = async (req, res) => {
    const txID = req.headers[constants.REQUEST_HEADERS.TRANSACTION_ID];
    try {
        const customerId = req.params.custId;
        const errMsg = validateRequiredField(customerId, 'customerId');
        if (errMsg) {
            return logAndSendErrorResponse(txID, res, { statusCode: 400, message: errMsg }, 'deleteCustomer')
        };

        logger.info(`Delete Customer ${customerId}`, txID);
        const token = req.headers.authorization;
        const delId = await daoCustomer.deleteCustomer(txID, token, customerId);
        logger.response(200, `Successfully deleted`, txID);
        return res.status(200).json({
            message: `Deleted ${delId}`
        });
    } catch (error) {
        return logAndSendErrorResponse(txID, res, { statusCode: error.statusCode, message: error.message }, 'deleteCustomer')
    }
}

exports.updateCustomer = async (req, res) => {
    const txID = req.headers[constants.REQUEST_HEADERS.TRANSACTION_ID];
    const customerId = req.params.custId;
    const { label, url, businessType, billingId } = req.body;
    const myName = req.body.name;
    logger.info(`POST updateCustomer ${customerId}`, txID);

    try {
        const customer = {};
        customer.name = myName;
        customer.url = url;
        customer.label = label;
        customer.businessType = businessType;
        customer.billingId = billingId;

        const result = await daoCustomer.updateCustomer(txID, customerId, customer);
        logger.response(200, `Successfully updated cust in db: ${customerId}`, txID);
        return res.status(200).json({
            message: "Success",
            customerId: result.customerId,
        });
    } catch (error) {
        return logAndSendErrorResponse(txID, res, { statusCode: error.statusCode, message: error.message }, 'updateCustomer')
    }
};

/** *** Organization related  *** */

/*    
    Steps:
        1. validate 
             CustomerId exist, else Reject
             Org data: "name" must be non-empty & no prior org with same name
             Adrress data
        2. AppID: create scope, role. onboard Admin user in AppId : reject if data validate failed
                 scope: ver
                 Handle gracefully if appid fails
        3. Get userId from 2 for db.orgAdmin.userId. 
                Save Org , OrgAdmin, Address
                If db constrains fail, rollback, should revert appId??
    */
exports.addOrganization = async (req, res) => {
    const txID = req.headers[constants.REQUEST_HEADERS.TRANSACTION_ID];
    const customerId = req.params.custId;
    const myName = req.body.name;
    logger.info(`POST addOrg ${myName}`, txID);

    const logMsg = `Add Organization ${myName}`;
    const errMsg = validateRequiredField(customerId, 'customerId');
    if (errMsg) {
        return logAndSendErrorResponse(txID, res, { statusCode: 400, message: errMsg }, 'addOrganization')
    };

    const errMsg2 = validateReqBody(txID, req.body, ['name']);
    if (errMsg2) {
        return logAndSendErrorResponse(txID, res, { statusCode: 400, message: `Failed ${logMsg}: ${errMsg2}` }, 'addOrganization')
    };
    // TODO add contactPoints as users
    try {
        const org = req.body;
        const result = await daoOrganization.addOrganization(txID, customerId, org)

        logger.response(201, `Successfully added Org to db: ${myName}`, txID);
        return res.status(201).json({
            message: "Successfully created",
            customerId: result.customerId,
            orgId: result.orgId,
        });
    } catch (error) {
        return logAndSendErrorResponse(txID, res, { statusCode: error.statusCode, message: error.message }, 'addOrganization')
    }
};

exports.updateOrg = async (req, res) => {
    const txID = req.headers[constants.REQUEST_HEADERS.TRANSACTION_ID];
    const { orgId, custId } = req.params;

    const myName = req.body.name;
    logger.info(`POST updateOrg ${myName}`, txID);

    const errMsg = validateRequiredField(custId, 'customerId');
    if (errMsg) {
        return logAndSendErrorResponse(txID, res, { statusCode: 400, message: errMsg }, 'updateOrganization')
    };

    const errMsg2 = validateRequiredField(orgId, 'orgId');
    if (errMsg2) {
        return logAndSendErrorResponse(txID, res, { statusCode: 400, message: errMsg2 }, 'updateOrganization')
    };

    try {
        const org = req.body;
        const result = await daoOrganization.updateOrganization(txID, custId, orgId, org)

        logger.response(200, `Successfully updated Org in db: ${orgId}`, txID);
        return res.status(200).json({
            message: "Success",
            customerId: result.customerId,
            orgId: result.orgId,
        });
    } catch (error) {
        return logAndSendErrorResponse(txID, res, { statusCode: error.statusCode, message: error.message }, 'updateOrganization')
    }
};

exports.deleteOrg = async (req, res) => {
    const txID = req.headers[constants.REQUEST_HEADERS.TRANSACTION_ID];
    try {
        const { orgId, custId } = req.params;
        const errMsg = validateRequiredField(custId, 'customerId');
        const errMsg2 = validateRequiredField(orgId, 'orgId');
        if (errMsg || errMsg2) {
            return logAndSendErrorResponse(txID, res, { statusCode: 400, message: `${errMsg} ${errMsg2}` }, 'deleteOrg')
        };


        logger.info(`Delete Org ${orgId} for Customer ${custId}`, txID);
        const token = req.headers.authorization;
        const delId = await daoOrganization.deleteOrganization(txID, token, custId, orgId);
        logger.response(200, `Successfully deleted`, txID);
        return res.status(200).json({
            message: `Deleted ${delId}`
        });
    } catch (error) {
        return logAndSendErrorResponse(txID, res, { statusCode: error.statusCode, message: error.message }, 'deleteOrg')
    }
}

exports.getOrg = async (req, res) => {
    const txID = req.headers[constants.REQUEST_HEADERS.TRANSACTION_ID];
    try {
        const { orgId, custId } = req.params;

        const errMsg = validateRequiredField(custId, 'customerId');
        const errMsg2 = validateRequiredField(orgId, 'orgId');
        if (errMsg || errMsg2) {
            return logAndSendErrorResponse(txID, res, { statusCode: 400, message: `${errMsg} ${errMsg2}` }, 'getOrg')
        };

        logger.info(`Get Org ${orgId} for Customer ${custId}`, txID);

        const result = await daoOrganization.getOrganization(txID, custId, orgId);
        logger.response(200, `Successfully retrieved org`, txID);
        return res.status(200).json({
            org: { ...result }
        });
    } catch (error) {
        return logAndSendErrorResponse(txID, res, { statusCode: error.statusCode, message: error.message }, 'getOrg')
    }
}


exports.getAllCustomerOrgs = async (req, res) => {
    const txID = req.headers[constants.REQUEST_HEADERS.TRANSACTION_ID];
    try {
        const customerId = req.params.custId;
        const errMsg = validateRequiredField(customerId, 'customerId');
        if (errMsg) {
            return logAndSendErrorResponse(txID, res, { statusCode: 400, message: errMsg }, 'getAllCustomerOrgs')
        };

        logger.info(`GetAll Organizations for a Customer`, txID);
        // todo pagination
        const result = await daoOrganization.getAllOrganizations(txID, customerId);
        logger.response(200, `Successfully retrieved organizations`, txID);
        return res.status(200).json({
            orgs: { data: result }
        });
    } catch (error) {
        return logAndSendErrorResponse(txID, res, { statusCode: error.statusCode, message: error.message }, 'getAllCustomerOrgs')
    }
}

/* *** Verifier related ***  */
exports.addVerifier = async (req, res) => {
    const txID = req.headers[constants.REQUEST_HEADERS.TRANSACTION_ID];

    const customerId = req.params.custId;
    const { orgId } = req.params;
    const myName = req.body.name;
    logger.info(`POST addVerifier ${myName}, orgId ${orgId}, customerId ${customerId}`, txID);
    const logMsg = `Add Verifier ${myName}`;
    const errMsg = validateRequiredField(orgId, 'orgId');
    if (errMsg) {
        return logAndSendErrorResponse(txID, res, { statusCode: 400, message: errMsg }, 'addVerifier')
    };

    const errMsg2 = validateReqBody(txID, req.body, ['name']);
    if (errMsg2) {
        return logAndSendErrorResponse(txID, res, { statusCode: 400, message: `Failed ${logMsg}: ${errMsg2}` }, 'addVerifier')
    };

    try {
        const verifier = req.body;
        const token = req.headers.authorization;
        const result = await daoVerifier.addVerifier(txID, token, orgId, verifier)

        logger.response(201, `Successfully created verifier: ${myName}`, txID);
        return res.status(201).json({
            message: "Successfully created",
            verifierId: result.verifierId,
            customerId: result.customerId,
            orgId: result.orgId,
        });
    } catch (error) {
        return logAndSendErrorResponse(txID, res, { statusCode: error.statusCode, message: error.message }, 'addVerifier')
    }
};

exports.getVerifier = async (req, res) => {
    const txID = req.headers[constants.REQUEST_HEADERS.TRANSACTION_ID];
    try {
        const { orgId, verifierId } = req.params;

        const errMsg = validateRequiredField(orgId, 'orgId');
        const errMsg2 = validateRequiredField(verifierId, 'verifierId');
        if (errMsg || errMsg2) {
            return logAndSendErrorResponse(txID, res, { statusCode: 400, message: `${errMsg} ${errMsg2}` }, 'getVerifier')
        };

        logger.info(`Get Verifier ${verifierId}`, txID);

        const result = await daoVerifier.getVerifier(txID, orgId, verifierId);
        logger.response(200, `Successfully retrieved Verifier`, txID);
        return res.status(200).json({
            verifier: { ...result }
        });
    } catch (error) {
        return logAndSendErrorResponse(txID, res, { statusCode: error.statusCode, message: error.message }, 'getVerifier')
    }
}

exports.getAllVerifierForOrg = async (req, res) => {
    const txID = req.headers[constants.REQUEST_HEADERS.TRANSACTION_ID];
    try {
        const { orgId } = req.params;
        const errMsg = validateRequiredField(orgId, 'orgId');
        if (errMsg) {
            return logAndSendErrorResponse(txID, res, { statusCode: 400, message: errMsg }, 'getAllVerifierForOrg')
        };

        logger.info(`GetAll Organizations for a Customer`, txID);

        const result = await daoVerifier.getAllVerifier(txID, orgId);
        logger.response(200, `Successfully retrieved verifiers for org ${orgId}`, txID);
        return res.status(200).json({
            verifiers: { data: result }
        });
    } catch (error) {
        return logAndSendErrorResponse(txID, res, { statusCode: error.statusCode, message: error.message }, 'getAllVerifierForOrg')
    }
}

exports.getVerifierCredential = async (req, res) => {
    const txID = req.headers[constants.REQUEST_HEADERS.TRANSACTION_ID];
    try {
        const { orgId, verifierId } = req.params;
        const responseType = (req.query.type === 'json') ? 'json' : 'qr';

        const errMsg = validateRequiredField(orgId, 'orgId');
        const errMsg2 = validateRequiredField(verifierId, 'verifierId');
        if (errMsg || errMsg2) {
            return logAndSendErrorResponse(txID, res, { statusCode: 400, message: `${errMsg} ${errMsg2}` }, 'getVerifierCredential')
        };

        return await daoVerifier.getCredential(txID, res, orgId, verifierId, responseType);
    } catch (error) {
        const status = error.statusCode || 500;
        return logAndSendErrorResponse(txID, res, { statusCode: status, message: error.message }, 'getVerifierCredential')
    }
}

exports.revokeVerifierCredential = async (req, res) => {

    const txID = req.headers[constants.REQUEST_HEADERS.TRANSACTION_ID];
    try {
        const { orgId, verifierId } = req.params;

        const errMsg = validateRequiredField(orgId, 'orgId');
        const errMsg2 = validateRequiredField(verifierId, 'verifierId');
        if (errMsg || errMsg2) {
            return logAndSendErrorResponse(txID, res, { statusCode: 400, message: `${errMsg} ${errMsg2}` }, 'revokeVerifierCredential')
        };
        const token = req.headers.authorization;
        await daoVerifier.revokeVerifier(txID, token, orgId, verifierId);
        logger.response(200, `Successfully revoked verifier ${verifierId}`, txID);
        return res.status(200).json({
            message: `Successfully revoked verifier ${verifierId}`
        });
    } catch (error) {
        const status = error.statusCode || 500;
        return logAndSendErrorResponse(txID, res, { statusCode: status, message: error.message }, 'revokeVerifierCredential')
    }
}
