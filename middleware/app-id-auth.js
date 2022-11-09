/**
 * Digital Health Pass 
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 */

const passport = require('passport');
const appID = require('ibmcloud-appid');

const constants = require('../helpers/constants');

const { APIStrategy } = appID;
const url = `${process.env.APP_ID_AUTH_SERVER_HOST}/oauth/v4/${process.env.APP_ID_TENANT_ID}`;

passport.use(
    new APIStrategy({
        oauthServerUrl: url,
    })
);

const authenticateStandardUser = passport.authenticate(APIStrategy.STRATEGY_NAME, {
    session: false,
});

const authenticateSystemAdmin = passport.authenticate(APIStrategy.STRATEGY_NAME, {
    session: false,
    scope: constants.APP_ID_SCOPES.SYS_ADMIN,
});

const authenticateCustomerAdmin = passport.authenticate(APIStrategy.STRATEGY_NAME, {
    session: false,
    scope: constants.APP_ID_SCOPES.CUSTOMER_ADMIN,
});

const authenticateOrgAdmin = passport.authenticate(APIStrategy.STRATEGY_NAME, {
    session: false,
    scope: constants.APP_ID_SCOPES.ORG_ADMIN,
});


module.exports = {
    authenticateStandardUser,
    authenticateSystemAdmin,
    authenticateCustomerAdmin,
    authenticateOrgAdmin
};
