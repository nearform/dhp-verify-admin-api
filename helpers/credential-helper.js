
/**
 * Digital Health Pass 
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 */
const qrCode = require('qrcode');
const axios = require('axios');

const config = require('../config');
const constants = require('./constants');
const hpassHelper = require('./hpass-helper');
const dbModels = require('../models/dbmodels');
const tlsHelper = require('./tls-helper');
const { getErrorInfo } = require("./utils");

const Logger = require('../config/logger');

const logger = new Logger('credential-helper');
let vcIssuerId = '';
let vcSchemaId = '';
if (config.verifierCredentialGeneration) {
    vcIssuerId = process.env.VC_ISSUER_ID;
    vcSchemaId = process.env.VC_SCHEMA_ID;
}
const credType = constants.CREDENTIAL_TYPES.string;

const credentialAPI = axios.create({
    baseURL: `${process.env.CREDENTIALS_API}/api/v1`,
    timeout: config.timeout * 2,
    httpsAgent: tlsHelper.getAgentHeaderForSelfSignedCerts(),
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
});

const getIssuerOwn = async (txID, token, issuerID) => {
    logger.debug(`call GET /health-authorities?own=true`, txID);

    return credentialAPI.get(`/health-authorities?own=true`, {
        headers: {
            Authorization: token,
            [constants.REQUEST_HEADERS.ISSUER_ID]: issuerID,
            [constants.REQUEST_HEADERS.TRANSACTION_ID]: txID,
        },
    });
};

// Was created as workaround when Revoke fail due to commit strategy error
exports.checkPendingCredentialRevoke = async (txID, token, verifier) => {

    const { verifierId, orgId, did, status } = verifier;
    logger.debug(`check PendingRevoke Credential for id: ${verifierId} org:${orgId}`, txID);

    try {
        const statusRes = await hpassHelper.getRevokeStatus(
            txID,
            token,
            did
        );

        if (statusRes.data.payload && statusRes.data.payload.id) {
            logger.info(`Revoke confirmed for id: ${verifierId}, original status ${status}`, txID);
            // eslint-disable-next-line no-param-reassign
            verifier.status = dbModels.verifierStatusEnum.revoked;
        }

    } catch (error) {
        const { errorStatus, errorMsg } = getErrorInfo(txID, error);
        logger.error(`Error calling getRevokeStatus for id ${verifierId}, current status:${status}
            httpcode:${errorStatus} ${errorMsg}`, txID);
    }
    return verifier;
}

exports.generateVerifierCredential = async (txID, token, verifier, expirationDate) => {
    logger.debug('generate verifier Credential()', txID);
    const { verifierType, orgId, customerId, customer, configId, configName, organization } = verifier;

    const credentialData = {
        type: constants.VER_CREDENTIAL_TYPE_VALUE,
        name: verifier.label || verifier.name,
        verifierType,
        organizationId: orgId,
        customerId,
        configId,
        configName,
        customer,
        organization
    }

    logger.debug(`Credential data for verifierId ${credentialData.name}: ${JSON.stringify(credentialData)}`, txID);


    if (!vcIssuerId) {
        const errMsg = `Params for verifierCredentialGeneration could not be resolved`;
        const err = { statusCode: 500, message: errMsg };
        throw err;
    }
    if (!vcSchemaId) {
        const issuerOwnRes = await getIssuerOwn(txID, token, vcIssuerId);
        if (issuerOwnRes.data && issuerOwnRes.data.payload && issuerOwnRes.data.payload.length === 1) {
            const didIssuer = issuerOwnRes.data.payload[0].id;
            if (!didIssuer) {
                const errMsg = `Schema ID for verifierCredentialGeneration could not be resolved`;
                const err = { statusCode: 500, message: errMsg };
                throw err;
            }
            vcSchemaId = `${didIssuer};${config.verifierCredentialGeneration.schemaId}`;
        }
        logger.debug(`Resolved vc schema ${vcSchemaId}`, txID);

    }


    // call healthpass-api to generate profile credential
    const issuerID = vcIssuerId;
    const schemaID = vcSchemaId;
    logger.debug(`Creating credential for ${credentialData.name} \
            by issuerId=${issuerID} with schemaId=${schemaID}`, txID);
    const profileCredential = await hpassHelper.createCredentialSafe(
        txID,
        token,
        credType,
        issuerID,
        schemaID,
        credentialData,
        expirationDate,
        {}
    );
    const credentialOutput = {};
    if (credType === constants.CREDENTIAL_TYPES.string) {
        const credDID = profileCredential.data.payload.id;

        // valid profileCredential.data.payload
        const { payload } = profileCredential.data;
        credentialOutput.issuer = payload.issuer;
        credentialOutput.did = credDID;
        credentialOutput.vc = payload;
    }

    logger.debug(`Done Credential generation, did ${credentialOutput.did}`);

    return credentialOutput;
}

exports.convertToQRCodePNG = async (txID, stringCredentials) => {

    const QR_OPTIONS = {
        scale: 2,
        errorCorrectionLevel: 'L'
    };

    const bufferImage = await qrCode.toDataURL(stringCredentials, QR_OPTIONS);
    const base64Data = Buffer.from(bufferImage.replace(/^data:image\/\w+;base64,/, ''), 'base64');

    logger.info(`generated qrcode`, txID);
    return base64Data;
};

exports.credentialIssuerID = vcIssuerId;
