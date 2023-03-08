/**
 * Digital Health Pass 
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 */

const jwtAuth = require('./jwt-auth');
const appIDAuth = require('./app-id-auth');
const constants = require('../helpers/constants');

// eslint-disable-next-line complexity
const getAuthStrategy = (role) => {
    return jwtAuth;
  
    if (process.env.AUTH_STRATEGY === 'DEVELOPMENT') {
        return jwtAuth;
    }

    let authStrategy;
    if (role === constants.APP_ID_SCOPES.SYS_ADMIN) {
        authStrategy = appIDAuth.authenticateSystemAdmin;
    } else if (role === constants.APP_ID_SCOPES.CUSTOMER_ADMIN) {
        authStrategy = appIDAuth.authenticateCustomerAdmin;
    } else if (role === constants.APP_ID_SCOPES.ORG_ADMIN) {
        authStrategy = appIDAuth.authenticateOrgAdmin;
    } else {
        authStrategy = appIDAuth.authenticateStandardUser;
    }

    return authStrategy;
};

module.exports = {
    getAuthStrategy,
};
