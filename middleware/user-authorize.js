/**
 * Digital Health Pass 
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 */

const jwt = require('jsonwebtoken');
const config = require('../config');
const constants = require('../helpers/constants');
const Logger = require('../config/logger');

const logger = new Logger('user-authorize');

// eslint-disable-next-line complexity
const doCustOrgAuthorization = (accessToken, paramCustId, paramOrgId) => {
    /*    
    if (process.env.AUTH_STRATEGY === 'DEVELOPMENT') {
        return true;  //skip db based Authorization
    }*/

    let isAuthorized = false;
    try {
        const decoded = jwt.decode(accessToken);
        if (!decoded || !decoded.scope) {
            logger.debug(`Bad token`);
            return isAuthorized;
        }
        const custAttribute = constants.USER_ATTRIBUTE_NAMES.CUSTOMER_ID;
        const orgAttribute = constants.USER_ATTRIBUTE_NAMES.ORG_ID;

        const userCustomerId = decoded[custAttribute];
        const userOrgId = decoded[orgAttribute];
        logger.debug(`Check sub:${decoded.sub}, attribs cust ${userCustomerId} org ${userOrgId}`);
        let custAuth = false; let orgAuth = false;

        if (decoded.scope.includes(constants.APP_ID_SCOPES.SYS_ADMIN) ||
            (paramCustId && userCustomerId === paramCustId)) {
            custAuth = true;
        }
        else {
            logger.debug(`authCust:${userCustomerId} paramCustId:${paramCustId} Failed`);
        }

        if (decoded.scope.includes(constants.APP_ID_SCOPES.CUSTOMER_ADMIN) ||
            (paramOrgId && userOrgId === paramOrgId)) {
            orgAuth = true;
        }
        else {
            logger.debug(`authOrg:${userOrgId} paramCustId:${paramOrgId} Failed`);
        }

        if (custAuth && orgAuth)
            isAuthorized = true;


    } catch (err) {
        logger.error(`Failed during doCustOrgAuthorization: ${err.message}`);
        throw err;
    }

    return isAuthorized;
}


// eslint-disable-next-line complexity
const authorizeUser = async (req, res, next) => {
    return next();
    const txID = req.headers[constants.REQUEST_HEADERS.TRANSACTION_ID]; // todo
    let userAuth = false;
    const userId = '';
    const userTokenAuth = req.headers.authorization;
    const { orgId, custId } = req.params;
    if (!config.dbuserBasedAuthorization) {
        logger.debug(`Skipping dbuser based authorize check. Using config.dbuserBasedAuthorization`);
        return next();
    }
    logger.debug(`Authorize check for: cust ${custId} org ${orgId}`);

    try {
        if (userTokenAuth) {

            logger.debug(`using Token attributes to authorize`);
            const accessToken = req.headers.authorization.split(' ')[1];
            if (doCustOrgAuthorization(accessToken, custId, orgId)) {
                userAuth = true;
            }
            else {
                logger.info(`Authorization denied to user:${userId} for cust ${custId},  org ${orgId}`);
            }
        }

        if (userAuth)
            return next();

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

module.exports = authorizeUser;
