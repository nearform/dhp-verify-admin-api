/* eslint-disable max-len */

/**
 * Digital Health Pass 
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 */

const constants = require('../helpers/constants');
const { validateReqBody, logAndSendErrorResponse, changeResultToGroupBy } = require('../helpers/utils');
const Logger = require('../config/logger');
const profileDataAccess = require('../data-access/profile');

const logger = new Logger('profile-controller');

exports.createProfile = async (req, res) => {
    const txID = req.headers[constants.REQUEST_HEADERS.TRANSACTION_ID];
    logger.info('Entering POST /profile controller', txID);

    const requiredFields = ['updatedBy'];
    const errMsg = validateReqBody(txID, req.body, requiredFields);

    if (errMsg) {
        return logAndSendErrorResponse(txID, res, { statusCode: 400, message: errMsg }, `profile`)
    };

    const { profileId } = req.params;
    const { updatedBy } = req.body;

    try {

        const record = await profileDataAccess.getProfile(txID, profileId);
        if (record && record.length > 0) {
            logger.response(409, `Record already exist for profileId: ${profileId}`, txID);

            return res.status(409).json({
                message: "Record already exist"
            });
        }
        const result = await profileDataAccess.createProfile(txID, profileId, updatedBy);
        logger.response(201, `Successfully added to db: ${result.id}`, txID);
        return res.status(201).json({
            message: "Successfully created profile record"
        });

    } catch (error) {
        const errorMsg = `failed to create profile for profileId: ${profileId} with error ${error.message}`;
        return logAndSendErrorResponse(txID, res, { statusCode: error.statusCode, message: errorMsg }, 'createprofile')
    }
};

exports.getProfile = async (req, res) => {
    const txID = req.headers[constants.REQUEST_HEADERS.TRANSACTION_ID];
    logger.info('Entering GET /profile/:profileId controller', txID);
    const { profileId } = req.params;

    if (profileId === "-1") {
        logger.response(403, `Not allowed to get record for master profile`, txID);
        return res.status(403).json({
            message: `Not allowed to get record for master profile`
        });
    }

    try {
        const result = await profileDataAccess.getProfile(txID, profileId);
        if (result && result.length > 0) {
            const finalResult = changeResultToGroupBy(result);
            logger.response(200, `Successfully get record for profileId: ${profileId}`, txID);
            return res.status(200).json({
                result: finalResult
            });
        }

        logger.response(404, `No record found for profileId: ${profileId}`, txID);
        return res.status(404).json({
            message: `No record found`
        });

    } catch (error) {
        const errorMsg = `Failed to get profile for profileId: ${profileId} with error ${error.message}`;
        return logAndSendErrorResponse(txID, res, { statusCode: error.statusCode, message: errorMsg }, 'profile')
    }
};

exports.addConfig = async (req, res) => {
    const txID = req.headers[constants.REQUEST_HEADERS.TRANSACTION_ID];
    logger.info('Entering PATCH /profile/adconfig controller', txID);

    const requiredFields = ['configId', 'version', 'updatedBy'];
    const errMsg = validateReqBody(txID, req.body, requiredFields);
    if (errMsg) {
        return logAndSendErrorResponse(txID, res, { statusCode: 400, message: errMsg }, `addconfig`)
    };

    const { configId, version } = req.body;
    const { profileId } = req.params;

    try {

        const hasSuccess = await profileDataAccess.updateOrCreateProfile(txID, profileId, req.body);
        if (!hasSuccess) {
            logger.response(409, `Record already exist for profileId: ${profileId}, configId: ${configId}, version: ${version}`, txID);
            return res.status(409).json({
                message: "Record already exist"
            });
        }

        const result = await profileDataAccess.getProfile(txID, profileId);

        const finalResult = changeResultToGroupBy(result);
        logger.response(201, `Successfully get record for profileId: ${finalResult.profileId}`, txID);
        return res.status(201).json({
            result: finalResult
        });

    } catch (error) {
        const errorMsg = `Failed to update profile for profileId: ${profileId} with error ${error.message}`;
        return logAndSendErrorResponse(txID, res, { statusCode: error.statusCode, message: errorMsg }, 'addconfig')
    }
}

exports.deleteConfig = async (req, res) => {
    const txID = req.headers[constants.REQUEST_HEADERS.TRANSACTION_ID];
    logger.info('Entering PATCH /profile/deleteconfig controller', txID);

    const requiredFields = ['configId', 'version'];
    const errMsg = validateReqBody(txID, req.body, requiredFields);
    if (errMsg) {

        return logAndSendErrorResponse(txID, res, { statusCode: 400, message: errMsg }, `deleteconfig`)
    };
    const { configId, version } = req.body;
    const { profileId } = req.params;

    try {

        const rowDeleted = await profileDataAccess.deleteProfileConfig(txID, profileId, req.body);
        if (rowDeleted >= 1) {
            logger.response(200, `Successfully deleted for profileId: ${profileId}`, txID);

            const result = await profileDataAccess.getProfile(txID, profileId);
            const finalResult = changeResultToGroupBy(result);

            return res.status(200).json({
                result: finalResult
            });
        }

        logger.response(404, `No record found for profileId: ${profileId}`, txID);
        return res.status(404).json({
            message: `No record found`
        });

    } catch (error) {
        const errorMsg = `Failed to delete config for profileId: ${profileId}, configId: ${configId}, version: ${version} with error ${error.message}`;
        return logAndSendErrorResponse(txID, res, { statusCode: error.statusCode, message: errorMsg }, 'profile')
    }
}

exports.deleteProfile = async (req, res) => {
    const txID = req.headers[constants.REQUEST_HEADERS.TRANSACTION_ID];
    logger.info('Entering DELETE /profile/:profileId controller', txID);

    const { profileId } = req.params;

    if (profileId === "-1") {
        logger.response(403, `Not allowed to delete this profileId: ${profileId}`, txID);
        return res.status(403).json({
            message: `Not allowed to delete this profileId`
        });
    }

    try {

        const rowDeleted = await profileDataAccess.deleteProfile(txID, profileId);
        if (rowDeleted >= 1) {
            logger.response(200, `Successfully deleted for profileId: ${profileId}`, txID);
            return res.status(200).json({
                message: `Successfully deleted ${rowDeleted} record.`
            });
        }

        logger.response(404, `No record found for profileId: ${profileId}`, txID);
        return res.status(404).json({
            message: `No record found`
        });

    } catch (error) {
        const errorMsg = `Failed to delete profile for profileId: ${profileId} with error ${error.message}`;
        return logAndSendErrorResponse(txID, res, { statusCode: error.statusCode, message: errorMsg }, 'profile')
    }
};