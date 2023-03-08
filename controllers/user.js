/**
 * Digital Health Pass 
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 */

const jwt = require('jsonwebtoken');

const helper = require('../helpers/app-id-helper');
const userDao = require('../data-access/dbuser');
const custDao = require('../data-access/customer');
const orgDao = require('../data-access/organization');
const constants = require('../helpers/constants');
const { logAndSendErrorResponse } = require('../helpers/utils');
const crypto = require("crypto");

const Logger = require('../config/logger');

const logger = new Logger('user-controller');

// eslint-disable-next-line max-len
const emailRegex = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;

const getJwtToken = (email) => {
    logger.debug('Get local jwt token for login');

    const token = jwt.sign(
        {
            email,
            subject: '1d44cdc1-4b78-4ef7-a5a2-08aabc13619f',
            given_name: 'Tester',
            family_name: 'POC',
            tenant: '14dbfeaa-d6bf-4c10-974c-2c45df4666df',
            name: 'Tester POC',
            organization: 'HealthPassOrg',
        },
        'secretkey$5',
        {
            expiresIn: '8h',
        }
    );

    return {
        access_token: token,
        id_token: token,
        token_type: 'Bearer',
        expires_in: 28800,
        scope: process.env.AUTH_USER_SCOPE,
    };
};

// eslint-disable-next-line complexity
const validateOnboardingRequestInputs = ({ email,
    firstName, lastName, role }) => {
    const missingFields = []

    if (!email) { missingFields.push("email") }
    if (!firstName) { missingFields.push("firstName") }
    if (!lastName) { missingFields.push("lastName") }
    if (!role) { missingFields.push("role") }

    if (missingFields.length > 0) {
        throw new Error(`Request body missing required attributes: ${missingFields.join(', ')}`)
    }
    let validRole = false;
    Object.values(constants.USER_ROLES).forEach(element => {
        if (role === element)
            validRole = true;
    });

    if (!validRole)
        throw new Error(`Invalid role value: ${role}`);

}

// eslint-disable-next-line complexity, no-unused-vars
exports.login = async (req, res, next) => {
    const { email, password } = req.body;
    const txID = req.headers[constants.REQUEST_HEADERS.TRANSACTION_ID];

    logger.debug(`Attempting user login`);

    // Note: keep error message for bad login generic for security - currently same as AppID message
    if (!email || !password || !emailRegex.test(email)) {
        return res.status(400).json({
            error: {
                message: 'The email or password that you entered is incorrect.',
            },
        });
    }

    let authObject = {};
    try {
        authObject =
            process.env.AUTH_STRATEGY === 'DEVELOPMENT' ? getJwtToken(email) : await helper.loginAppID(email, password);

        authObject.userId = process.env.AUTH_USER_ID
        authObject.customerId = process.env.AUTH_CUSTOMER_ID
        authObject.customerName = process.env.AUTH_CUSTOMER_NAME
        authObject.orgName = process.env.AUTH_ORG_NAME
        authObject.orgId = process.env.AUTH_ORG_ID

        if (req.session)
            req.session.isAuthenticated = true;

        /*         // return additional information from AppID about the logged in user
        const userInfo = await helper.getUserInfo(`Bearer ${authObject.access_token}`);
        // authObject.userInfo = userInfo;
        if (userInfo && userInfo.identities[0]) {
            authObject.userId = userInfo.identities[0].id;
            // add customerId, customerName, orgId, orgName
            const dbUser = await userDao.getDbUserById('', authObject.userId);

            if (dbUser.customerId && dbUser.customerId !== constants.WILDCARD_USER_AUTHORIZE) {
                authObject.customerId = dbUser.customerId
                // resolve the customer ID to the name of the customer name
                const retCust = await custDao.getCustomer(txID, dbUser.customerId);
                authObject.customerName = (retCust) ? retCust.label : "";
            }

            if (dbUser.orgId && dbUser.orgId !== constants.WILDCARD_USER_AUTHORIZE) {
                authObject.orgId = dbUser.orgId
                // resolve the org ID to the name of the org name
                const retOrg = await orgDao.getOrganization(txID, dbUser.customerId, dbUser.orgId);
                authObject.orgName = (retOrg) ? retOrg.label : "";
            } 

            if (req.session)
                req.session.isAuthenticated = true;
        }
        else {
            logger.info("User not found in AppID");
        }
        */

    } catch (error) {
        // only loginAppID() can throw an error
        const errStatus = error.status || 500;
        const errMsg = error.message || 'Login failed';
        if (errStatus === 500) {
            logger.error(`Failed to login user with AppID with error ${error.message}`);
        } else {
            logger.info(`Failed to login user with AppID ${error.message}`);
        }

        return res.status(errStatus).json({
            error: {
                message: errMsg,
            },
        });
    }
    return res.status(200).json(authObject);
};

const clientId = process.env.APP_ID_CLIENT_ID;

exports.resetPassword = async (req, res) => {
    const { userId } = req.body;
    const txID = req.headers[constants.REQUEST_HEADERS.TRANSACTION_ID];

    try {
        await helper.sendResetPasswordEmail(userId);
        return res.status(200).send({ status: 200, message: 'Reset password mail was sent.' })
    } catch (error) {
        return logAndSendErrorResponse(txID, res, error, 'resetPassword');
    }
}

exports.listUsers = async (req, res) => {
    const { custId, orgId } = req.query;
    const txID = req.headers[constants.REQUEST_HEADERS.TRANSACTION_ID];
    try {
        let userList = [];

        if (custId || orgId) {
            userList = await userDao.listUsersByCustOrg(txID, custId, orgId);
            logger.info(`User list count ${userList.length} `);

            // resovle userId to users in AppId
            const asyncResult = await Promise.all(userList.map(async (user) => helper.getUser(user.userId)));
            return res.status(200).send(asyncResult)
        }

        return res.status(404).send({ message: 'No custId or orgId provided to listUsers()' })

    } catch (error) {
        logger.error(`Failed during listing DBUser: ${error}`);
        return logAndSendErrorResponse(txID, res, error, 'listUsers from AppID');
    }
}

// We should do the following workflow:
// 0. validate input , validate custId, orgId from DB
// 1. create a new User (and User Profile)
// 2. Assign the User Profile (from 1) to Role(s)
//   - if failed, offboardUser
// 3. add user metadata to DB
exports.onboardUser = async (req, res) => {
    const { role, customerId, orgId, email, firstName, lastName, password } = req.body;
    const txID = req.headers[constants.REQUEST_HEADERS.TRANSACTION_ID];

    try {
        validateOnboardingRequestInputs({ clientId, ...req.body, role });
        await userDao.validateCustomerOrgIdForUser(txID, customerId, orgId, role);

        // 1. create an AppID user (based on email), Add user with custid/orgid attrib, assign User the Role

        /*         const createResponse = await helper.createUser(email, firstName, lastName, password, role, customerId, orgId);
        const { uId, pId } = createResponse; */

        const uId = crypto.randomBytes(16).toString("hex");
        const pId = crypto.randomBytes(16).toString("hex");

        logger.debug(`Appid: ${email} created with ID ${uId}, profileId ${pId}`);

        // 2. add user metadata to DB
        try {
            const dbuser = await userDao.addDbUser(txID, uId, customerId, orgId, { role });
            logger.debug(`Dbuser: Added ${dbuser.userId} as ${dbuser.role} `);
        } catch (err) {
            logger.error(`Failed during addDBUser: ${err}`);
            throw err;
        }

        logger.info(`User onboarded successfully id ${uId} `);
        return res.status(200).json({
            message: "User onboarded successfully.",
            data: {
                userId: uId,
                role,
                customerId,
                orgId
            }
        })

    } catch (error) {

        // more robust error detail capture
        return logAndSendErrorResponse(txID, res, error, 'onboardUser');
    }
};

// 
/* Steps
    - validate input . Get email > getUserInfo by email in AppId? > userId
    - validate userId from DB
    - Delete the User from AppID (which deletes the User Profile)
    - if failed, do nothing
    - delete user metadata to DB
    */
exports.offboardUser = async (req, res) => {
    const { email, userId } = req.body;
    const txID = req.headers[constants.REQUEST_HEADERS.TRANSACTION_ID];
    const validateOffboardingRequestInputs = ({ userId, email }) => {
        const missingFields = []

        if (!email && !userId) { missingFields.push("userId or email") }

        if (missingFields.length > 0) {
            throw new Error(`Request body missing inputs: ${missingFields.join(', ')}`)
        }
    }

    // TODO get userId from email > delete User from DB
    try {
        validateOffboardingRequestInputs({ ...req.body });

        await this.deleteUser(txID, userId, email);
        logger.response(200, "User offboarded successfully", txID);
        return res.status(200).json({
            message: "User offboarded successfully.",
        })

    } catch (error) {

        return logAndSendErrorResponse(txID, res, error, 'offboardUser');
    }
};

exports.deleteUser = async (txID, userId, email) => {

    // 1. Delete the User from AppId (which deletes the User Profile)
    try {
        if (userId)
            await helper.deleteUser(userId);
        else if (email)
            // eslint-disable-next-line no-param-reassign
            userId = await helper.deleteUserByEmail(email);

        logger.debug(`User deleted successfully from Appid ${userId}`);

        // 2. Delete from user table
        await userDao.deleteDbUser(txID, userId);
    } catch (error) {
        logger.error(`User offboarded error ${error.message}`);
        throw error;
    }
}

const runCreateRole = async (roleName, scopeName) => {
    const roleId = await helper.createRole(clientId, roleName, scopeName);
    logger.info(`Appid: Created Role ${roleName} with scope ${scopeName} roleId ${roleId}`);
}

exports.onboardApp = async (req, res) => {
    const txID = req.headers[constants.REQUEST_HEADERS.TRANSACTION_ID];
    if (!clientId)
        throw new Error(`Env APP_ID_CLIENT_ID is not set`);

    try {
        logger.info(`Onboarding App verifier-admin`);

        const scopes = [constants.APP_ID_SCOPES.SYS_ADMIN,
            constants.APP_ID_SCOPES.CUSTOMER_ADMIN,
            constants.APP_ID_SCOPES.ORG_ADMIN,
            constants.APP_ID_SCOPES.METERING_REPORTER];

        // 1. define a Scope if it doesn't exist and associate it with the application above
        for (let i = 0; i < scopes.length; i += 1) {
            // eslint-disable-next-line no-await-in-loop
            await helper.createScope(clientId, scopes[i]);
            logger.info(`Appid: Scope ${scopes[i]} created successfully`);
        }
    } catch (error) {
        // more robust error detail capture
        return logAndSendErrorResponse(txID, res, error, 'CreatingAppidScope');
    }


    // 2. create an Role if it doesn't exist with the associated application (from 1)
    try {
        logger.info('\nAdding roles');
        await runCreateRole(constants.APP_ID_ROLENAMES.SYS_ADMIN, constants.APP_ID_SCOPES.SYS_ADMIN);
        await runCreateRole(constants.APP_ID_ROLENAMES.CUSTOMER_ADMIN, constants.APP_ID_SCOPES.CUSTOMER_ADMIN);
        await runCreateRole(constants.APP_ID_ROLENAMES.ORG_ADMIN, constants.APP_ID_SCOPES.ORG_ADMIN);
        await runCreateRole(constants.APP_ID_ROLENAMES.METERING_REPORTER, constants.APP_ID_SCOPES.METERING_REPORTER);

        logger.info(`App onboarded successfully`);
        return res.status(200).json({
            message: "App onboarded successfully"
        })

    } catch (error) {
        // more robust error detail capture
        return logAndSendErrorResponse(txID, res, error, 'CreatingAppidRoles');
    }
};
