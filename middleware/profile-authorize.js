/**
 * Digital Health Pass 
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 */

const jwt = require('jsonwebtoken');
const constants = require('../helpers/constants');
const Logger = require('../config/logger');

const logger = new Logger('profile-authorize');

const doCustOrgAuthorization = (accessToken, paramCustomerId) => {

    const custAttribute = constants.USER_ATTRIBUTE_NAMES.CUSTOMER_ID;
    let isAuthorized = false;

    try {
        const decoded = jwt.decode(accessToken);
        if (!decoded || !decoded.scope) {
            logger.debug(`Bad token`);
            return isAuthorized;
        }

        const tokenCustomerId = decoded[custAttribute];
        logger.debug(`Check sub:${decoded.sub}, attribs cust ${tokenCustomerId}`);

        if (decoded.scope.includes(constants.APP_ID_SCOPES.SYS_ADMIN) ||
            (paramCustomerId && tokenCustomerId === paramCustomerId)) {
            isAuthorized = true;
        } else {
            logger.debug(`authCust:${tokenCustomerId} paramCustId:${paramCustomerId} Failed`);
        }

    } catch (err) {
        logger.error(`Failed during doCustOrgAuthorization: ${err.message}`);
        throw err;
    }

    return isAuthorized;
}


const authorizeProfile = async (req, res, next) => {
  return next();
    const txID = req.headers[constants.REQUEST_HEADERS.TRANSACTION_ID];
    let userAuth = false;
    const userTokenAuth = req.headers.authorization;
    const { profileId: paramCustomerId } = req.params;  // profileId is generic name for customerId

    try {
        if (userTokenAuth) {
            logger.debug(`using Token attributes to authorize`);
            const accessToken = req.headers.authorization.split(' ')[1];
            if (doCustOrgAuthorization(accessToken, paramCustomerId)) {
                userAuth = true;
            } else {
                logger.info(`Authorization denied for custtomerId ${paramCustomerId}`);
            }
        }

        if (userAuth) {
            return next();
        }

        const errMsg = `User is not authorized for this operation`;
        logger.response(401, errMsg, txID);

        return res.status(401).json({
            error: {
                message: `${errMsg}`
            },
        });

    } catch (err) {
        logger.warn(`Error completing user authorization ${err}`);
        return res.status(500).json({
            error: {
                message: `${err.message}`
            },
        });
    }
}

module.exports = authorizeProfile;
