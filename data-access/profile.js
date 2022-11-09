/* eslint-disable max-len */
/**
 * Digital Health Pass 
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 */


const { Op } = require('sequelize');
const Logger = require('../config/logger');
const dbModels = require('../models/dbmodels');

const logger = new Logger('profile-data-access');

exports.createProfile = async (txID, profileId, updatedBy) => {

    try {
        logger.debug(`Attempt to save profile record for profileId: ${profileId}`, txID);
        const dbModel = await dbModels.DB.Profiles.create({ profileId, updatedBy });
        logger.debug(`Saved profile record for id: ${dbModel.id}`, txID);
        return {
            id: dbModel.id
        };

    } catch (error) {
        logger.error(`Error dbOperation: ${error}`, txID);
        const err = { statusCode: 500, message: `DB Write Error: ${error.message}` };
        throw err;
    }
};

exports.getProfile = async (txID, profileId) => {

    try {
        logger.debug(`Attempt to fetch profile records for profileId: ${profileId}`, txID);
        const matchQuery = {
            attributes: ['profileId', 'configId', 'version'],
            where: { profileId },
            raw: true
        };

        const result = await dbModels.DB.Profiles.findAll(matchQuery);
        logger.debug(`Fetch profile records for profileId: ${profileId}`, txID);
        return result;

    } catch (error) {
        logger.error(`Error dbOperation: ${error}`, txID);
        const err = { statusCode: 500, message: `DB Fetch Error: ${error.message}` };
        throw err;
    }
};

exports.updateOrCreateProfile = async (txID, profileId, reqBody) => {

    const { configId, version, updatedBy } = reqBody;

    try {

        const where = { profileId, [Op.or]: [{ configId: null }, { configId, version }] };
        const record = await dbModels.DB.Profiles.findOne({ attributes: ['configId'], where, raw: true });

        logger.debug(`Attempt to upsert record for profileId: ${profileId} and configId: ${configId}`, txID);

        if (!record) {
            await dbModels.DB.Profiles.create({ profileId, configId, version, updatedBy });
            logger.debug(`Successfully created record for profileId: ${profileId} and configId: ${configId}`, txID);

        } else if (!record.configId) {
            await dbModels.DB.Profiles.update({ configId, version, updatedBy }, { where: { profileId, configId: null } });
            logger.debug(`Successfully updated record for profileId: ${profileId} and configId: ${configId}`, txID);

        } else {
            logger.debug(`Record already exist for profileId: ${profileId}, configId: ${configId}, version: ${version}`, txID);
            return false;
        }

        return true;

    } catch (error) {
        logger.error(`Error dbOperation: ${error}`, txID);
        const err = { statusCode: 500, message: `DB upsert Error: ${error.message}` };
        throw err;
    }
};

exports.deleteProfileConfig = async (txID, profileId, reqBody) => {

    const { configId, version } = reqBody;
    try {
        logger.debug(`Attempt to delete record for profile for profileId: ${profileId}, configId ${configId}, version ${version}`, txID);
        const rowDeleted = await dbModels.DB.Profiles.destroy({ where: { profileId, configId, version } });
        logger.debug(`${rowDeleted} rows deleted for profileId: ${profileId}, configId ${configId}, version ${version}`, txID);

        return rowDeleted;

    } catch (error) {
        logger.error(`Error dbOperation: ${error}`, txID);
        const err = { statusCode: 500, message: `DB destroy row Error: ${error.message}` };
        throw err;
    }

};

exports.deleteProfile = async (txID, profileId) => {

    try {
        logger.debug(`Attempt to delete record for profile for profileId: ${profileId}`, txID);
        const rowDeleted = await dbModels.DB.Profiles.destroy({ where: { profileId } });
        logger.debug(`${rowDeleted} rows deleted for profileId: ${profileId}`, txID);

        return rowDeleted;

    } catch (error) {
        logger.error(`Error dbOperation: ${error}`, txID);
        const err = { statusCode: 500, message: `DB destroy row Error: ${error.message}` };
        throw err;
    }

};