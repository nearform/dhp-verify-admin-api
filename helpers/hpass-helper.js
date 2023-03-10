/**
 * Digital Health Pass 
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 */

const axios = require('axios');

const constants = require('./constants');
const config = require('../config');
const tlsHelper = require('./tls-helper');
const utils = require('./utils');
const credHelper = require('./credential-helper');
const Logger = require('../config/logger');

const logger = new Logger('hpass-helper');

const hpassAPI = axios.create({
    baseURL: `${process.env.HPASS_API}`,
    timeout: config.timeout,
    httpsAgent: tlsHelper.getAgentHeaderForSelfSignedCerts(),
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
});

// eslint-disable-next-line max-params
const createCredential = async (txID, token, type, issuerID, schemaID, data, expirationDate, credParams) => {
    logger.debug('createCredential()', txID);
    let createCredentialPath = '/credentials';
    if (type === constants.CREDENTIAL_TYPES.string) {
        createCredentialPath += '?type=string';
    }
    else if (type === constants.CREDENTIAL_TYPES.qr) {
        createCredentialPath += '?output=qrcode';
        // todo json cred to QR  /qrcode/generate
    }
    const credentialReqBody = {
        schemaID,
        data,
        type: [type]
    };

    if (expirationDate) {
        credentialReqBody.expirationDate = expirationDate;
        logger.debug('Requesting to generate a new credential with expirationDate', txID);
    }

    if (data.obfuscation) {
        credentialReqBody.obfuscation = credParams.obfuscation;
        logger.debug('Requesting to generate a new credential with obfuscation', txID);
    }

    return hpassAPI.post(createCredentialPath, credentialReqBody, {
        headers: {
            Authorization: token,
            [constants.REQUEST_HEADERS.ISSUER_ID]: issuerID,
            [constants.REQUEST_HEADERS.TRANSACTION_ID]: txID,
        },
    });

};

const revokeCredential = async (txID, token, credentialID, reason) => {
    const issuerID = credHelper.credentialIssuerID;
    logger.debug(`revokeCredential() using issuer ${issuerID}`, txID);
    const path = '/credentials/revoke';

    const credentialReqBody = {
        credentialID,
        reason,
    };

    return hpassAPI.post(path, credentialReqBody, {
        headers: {
            Authorization: token,
            [constants.REQUEST_HEADERS.ISSUER_ID]: issuerID,
            [constants.REQUEST_HEADERS.TRANSACTION_ID]: txID,
        },
    });

};

const getRevokeStatus = async (txID, token, credentialID) => {
    const issuerID = credHelper.credentialIssuerID;
    const encodedCredentialID = credentialID.replace(/#/g, '%23');

    logger.debug(`getRevokeStatus() for ${encodedCredentialID}`, txID);
    const path = `/credentials/${encodedCredentialID}/revoke_status/optional`;

    return hpassAPI.get(path, {
        headers: {
            Authorization: token,
            [constants.REQUEST_HEADERS.ISSUER_ID]: issuerID,
        },
    });
};
// Creates healthpass credential and makes sure content exists, otherwise throws error
// eslint-disable-next-line max-params
const createCredentialSafe = async (txID, token, type, issuerId, schemaId, data, expirationDate, credParams) => {
    logger.debug('createCredentialSafe()', txID);
    let credentials;
    try {
        logger.debug(`Attempting to create credential by issuerId=${issuerId} with schemaId=${schemaId}`)
        credentials = await createCredential(txID, token, type, issuerId, schemaId, data, expirationDate, credParams);
    } catch (err) {
        const { errorStatus, errorMsg } = utils.getErrorInfo(txID, err);
        logger.error(
            // eslint-disable-next-line max-len
            `Error occurred calling HealthPass create credential API, issuerId=${issuerId} schemaId=${schemaId}: ${errorStatus} ${errorMsg}`,
            txID
        );
        const error = { statusCode: errorStatus, message: errorMsg };
        throw error;
    }

    if (type === constants.CREDENTIAL_TYPES.string &&
        (!credentials || !credentials.data || !credentials.data.payload)) {
        // eslint-disable-next-line max-len
        const errMsg = `Failed to create credential, HealthPass API returned incomplete data, issuerId=${issuerId} schemaId=${schemaId}`;
        logger.error(errMsg, txID);
        const error = { statusCode: 500, message: errMsg };
        throw error;
    }
    return credentials;
};


module.exports = {
    hpassAPI,
    createCredential,
    createCredentialSafe,
    revokeCredential,
    getRevokeStatus,
};