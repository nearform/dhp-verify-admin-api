/**
 * Digital Health Pass 
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 */
const moment = require('moment');
const { Op } = require('sequelize');
const custDao = require('./customer');
const orgDao = require('./organization');
const dbModels = require('../models/dbmodels');
const credHelper = require('../helpers/credential-helper');
const hpassHelper = require('../helpers/hpass-helper');
const Logger = require('../config/logger');
const appConfig = require('../config');
const { getErrorInfo } = require('../helpers/utils');

const logger = new Logger('verifier-dao');
const defaultCredentialExpirySeconds = appConfig.verifierCredentialGeneration.expiryDays * 24 * 3600;

const toApiEntity = (dbModel) => {
    if (!dbModel)
        return {};
    const { verifierId, did, orgId, name, label, verifierType, expirationDate,
        status, credential, configId, configName } = dbModel;

    const apiObj = {
        verifierId,
        did,
        orgId,
        verifierType,
        name,
        label,
        configId,
        configName,
        expirationDate,
        status,
        credential
    }

    return apiObj;
}

const toApiPageResults = (modelArray) => {
    // todo add start index, limit
    return modelArray.map((item) => {
        return toApiEntity(item);
    });
}

const credentialExpirationDate = (secondsUntilExpiration) => {
    const now = moment();
    return now.add(secondsUntilExpiration, 'seconds').utc().format('YYYY-MM-DD[T]HH:mm:ss[Z]');
};

// eslint-disable-next-line complexity
exports.addVerifier = async (txID, token, orgId, apiVerifier) => {

    const myName = apiVerifier.name.trim();
    logger.debug(`Validation cust/org for the verifier ${myName}`, txID);

    const validOrg = await orgDao.validateOrganization(txID, orgId);
    if (!validOrg || !validOrg.orgId) {
        const errMsg = `Invalid Org: ${orgId}`;
        const err = { statusCode: 404, message: errMsg };
        throw err;
    }
    // get Customer label for VC
    const retCust = await custDao.getCustomer(txID, validOrg.customerId);
    if (!retCust || !retCust.customerId) {
        const errMsg = `Invalid Customer: ${validOrg.customerId}`;
        const err = { statusCode: 404, message: errMsg };
        throw err;
    }

    const verifier = {
        name: myName,
        verifierType: apiVerifier.verifierType,
        label: apiVerifier.label,
        configId: apiVerifier.configId,
        configName: apiVerifier.configName,
        customerId: validOrg.customerId,
        orgId
    };

    try {
        let expirySeconds = defaultCredentialExpirySeconds;
        if (apiVerifier.daysTillExpiry && !Number.isNaN(apiVerifier.daysTillExpiry)) {
            logger.debug(`Creating VC with daysTillExpiry ${apiVerifier.daysTillExpiry}`, txID);
            expirySeconds = apiVerifier.daysTillExpiry * 24 * 3600;
        }
        // generate verifier VC
        const expirationDate = credentialExpirationDate(expirySeconds);
        verifier.expirationDate = expirationDate;

        const verifierCredData = { ...verifier };
        verifierCredData.organization = validOrg.label || validOrg.name;
        verifierCredData.customer = retCust.label || retCust.name;

        const credentialRet = await credHelper.generateVerifierCredential(
            txID, token, verifierCredData, expirationDate);

        verifier.did = credentialRet.did;
        if (credentialRet.vc) {
            // verifier.credential = Buffer.from(JSON.stringify(credentialRet.vc))
            //    .toString('base64');
            const credToPersist = JSON.stringify(credentialRet.vc);
            logger.info(`verifier ${myName} ${verifier.did}, with credential length ${credToPersist.length}`, txID);
            verifier.credential = credToPersist;
        }
    } catch (error) {

        if (error.statusCode) {
            logger.error(`Failed to generate VerifierCredential: ${error.message}`, txID);
            throw error;
        }
        else {

            const err = { statusCode: 500, message: `Error generating VerifierCredential: ${error.message}` };
            throw err;
        }
    }

    try {
        logger.debug(`Attempt save verifier ${myName} with DID ${verifier.did}`, txID);
        const dbModel = await dbModels.DB.Verifier.create(verifier);
        logger.info(`Saved verifier ${dbModel.verifierId}`, txID);

        return {
            verifierId: dbModel.verifierId,
            name: dbModel.name,
            customerId: validOrg.customerId,
            orgId
        };
    } catch (error) {
        logger.error(`Error dbOperation: ${error}`, txID);
        const err = { statusCode: 500, message: `DB Write Error: ${error.message}` };
        throw err;
    }
};

// eslint-disable-next-line complexity
exports.revokeVerifier = async (txID, token, orgId, verifierId) => {

    logger.debug(`Validation cust/org for the verifier revoke: ${verifierId}`, txID);

    const validOrg = await orgDao.validateOrganization(txID, orgId);
    if (!validOrg || !validOrg.orgId) {
        const errMsg = `Invalid Org: ${orgId}`;
        const err = { statusCode: 404, message: errMsg };
        throw err;
    }

    // get Customer label for VC
    let retVerifier;
    try {
        retVerifier = await dbModels.DB.Verifier.findByPk(
            verifierId);
    } catch (error) {
        logger.error(`Error dbOperation: ${error}`, txID);
        const err = { statusCode: 500, message: `DB Read Error: ${error.message}` };
        throw err;
    }

    let revokeState = '';
    if (!retVerifier || !retVerifier.verifierId) {
        const errMsg = `Invalid Verifier ID: ${verifierId}`;
        const err = { statusCode: 404, message: errMsg };
        throw err;
    }
    if (retVerifier.status === dbModels.verifierStatusEnum.revoked) {
        const errMsg = `Verifier ID already revoked: ${verifierId}`;
        const err = { statusCode: 400, message: errMsg };
        throw err;
    }
    if (Date.parse(retVerifier.expirationDate) < Date.now()) {
        const infoMsg = `Disabling the Verifier that is already expired: ${verifierId}`;
        logger.info(infoMsg, txID);
        revokeState = dbModels.verifierStatusEnum.revoked;
    }
    else {
        const reason = "Revoked by verifier admin";

        try {

            // revoke verifier VC
            const credentialRet = await hpassHelper.revokeCredential(
                txID, token, retVerifier.did, reason);
            logger.debug(`Revoked ${verifierId} : ${credentialRet.data.message}`, txID);
            revokeState = dbModels.verifierStatusEnum.revoked;
        } catch (error) {
            const { errorStatus, errorMsg } = getErrorInfo(txID, error);

            if (errorStatus === 400 && errorMsg.indexOf('already exists') > -1) {
                // todo Error revoking VerifierCredential: Request failed with status code 400
                logger.info(`Verifier ${verifierId} already revoked`, txID);
                revokeState = dbModels.verifierStatusEnum.revoked;
            }
            else if (errorStatus === 400 || errorMsg.indexOf('external API timed out') > -1) {
                // workaround for "commit strategy error failed"
                logger.debug(`Unsuccessful in get revoked VerifierCredential response: ${errorMsg}`, txID);
                revokeState = dbModels.verifierStatusEnum.pending;
            }
            else {
                logger.error(`VerifierCredential revoke for id ${verifierId} failed.
                    status:${errorStatus} ${errorMsg}`, txID);
                const err = { statusCode: 500, message: `Error revoking VerifierCredential: ${errorMsg}` };
                throw err;
            }
        }
    }

    try {
        logger.info(`Ready to Delete (after Revoke) Verifier ${verifierId}`, txID);
        retVerifier.status = revokeState;
        await retVerifier.save();
        return verifierId;
    } catch (error) {
        logger.error(`Error dbOperation: ${error}`, txID);
        const err = { statusCode: 500, message: `Error during delete from DB` };
        throw err;
    }

}

// todo paging
exports.getAllVerifier = async (txID, orgId) => {

    logger.debug(`GetAll Verifiers orgId ${orgId}`, txID);
    const validOrg = await orgDao.validateOrganization(txID, orgId);
    if (!validOrg || !validOrg.orgId) {
        const errMsg = `Invalid Org: ${orgId}`;
        const err = { statusCode: 404, message: errMsg };
        throw err;
    }
    try {
        const now = new Date(Date.now());
        const result = await dbModels.DB.Verifier.findAll({
            where: {
                orgId,
                expirationDate: { [Op.gte]: now },
                status: 'active',
            }, // retrieves active status only
            attributes: ['verifierId', 'orgId', 'name', 'label', 'status', 'verifierType', 'expirationDate', 'did',
                'configId', 'configName'],
        });

        return toApiPageResults(result);

    } catch (error) {
        logger.error(`Error dbOperation: ${error}`, txID);
        const err = { statusCode: 500, message: `DB Read Error: ${error.message}` };
        throw err;
    }
}


// returns both active & revoked Verifier
exports.getVerifier = async (txID, orgId, verifierId) => {

    logger.debug(`Get Verifier`, txID);
    const validOrg = await orgDao.validateOrganization(txID, orgId);
    if (!validOrg || !validOrg.orgId) {
        const errMsg = `Invalid Org: ${orgId}`;

        const err = { statusCode: 404, message: errMsg };
        throw err;
    }
    try {

        const result = await dbModels.DB.Verifier.findByPk(
            verifierId);

        const retEntity = toApiEntity(result);
        return retEntity;
    } catch (error) {
        logger.error(`Error dbOperation: ${error}`, txID);
        const err = { statusCode: 500, message: `DB Read Error: ${error.message}` };
        throw err;
    }
}

exports.getCredential = async (txID, res, orgId, verifierId, type) => {

    logger.debug(`getCredential ${verifierId}`, txID);
    const verApiEntity = await this.getVerifier(txID, orgId, verifierId);

    let errMsg = `QR code generation failed`;
    let statusCode = 500;
    if (!verApiEntity || verApiEntity.status === 'revoked' || verApiEntity.status === 'inactive') {
        errMsg = `Verifier not found`;
        statusCode = 404;
    }
    else if (verApiEntity && verApiEntity.credential) {
        if (type === 'json') {
            // return credential as JSON
            return res.status(200).send(verApiEntity.credential);
        }

        // return credential as QR code
        const pngCredentialBase64 = await credHelper.convertToQRCodePNG(txID, verApiEntity.credential);
        if (pngCredentialBase64) {

            logger.response(200, `QR code for the verifier ${verifierId}`, txID);
            res.setHeader('Content-Type', 'image/png');
            return res.status(200).send(pngCredentialBase64);
        }
        errMsg = `Verifier credential convertion failed`;
    }
    else {
        errMsg = `Verifier credential not found`;
        statusCode = 404;
    }

    logger.response(statusCode, errMsg, txID);
    return res.status(statusCode).json({
        error: {
            message: errMsg
        }
    })
}

