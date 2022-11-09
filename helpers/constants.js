/**
 * Digital Health Pass 
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 */

exports.APP_ID_SCOPES = {
    SYS_ADMIN: 'verifier.sysadmin',
    CUSTOMER_ADMIN: 'verifier.custadmin',
    ORG_ADMIN: 'verifier.orgadmin',
    METERING_REPORTER: 'meter.reporter',
    // Credential revoking scope is managed in healthpass-core
};
exports.APP_ID_ROLENAMES = {
    SYS_ADMIN: 'verifier-sysadmin',
    CUSTOMER_ADMIN: 'verifier-custadmin',
    ORG_ADMIN: 'verifier-orgadmin',
    METERING_REPORTER: 'meter-reporter',
};
exports.HEALTHPASS_ADMIN_SCOPE = 'healthpass.admin';

exports.USER_ROLES = {
    SYSTEM_ADMIN: 'sysadmin',
    CUSTOMER_ADMIN: 'custadmin',
    ORG_ADMIN: 'orgadmin',
};

exports.USER_ATTRIBUTE_NAMES = {
    ORG_ID: 'org_id',
    CUSTOMER_ID: 'customer_id'
};

exports.WILDCARD_USER_AUTHORIZE = '*';

exports.REQUEST_HEADERS = {
    ISSUER_ID: 'x-hpass-issuer-id',
    TRANSACTION_ID: 'x-hpass-txn-id',
    DISABLE_APPID_CREATE_OVERRIDE: 'x-hpass-disable-appid-create-roles',
    DISABLE_APPID_DELETE_OVERRIDE: 'x-hpass-disable-appid-delete-roles'
};

exports.VER_CREDENTIAL_TYPE_VALUE = "VerifierCredential";
exports.CREDENTIAL_TYPES = {
    encoded: 'encoded',
    string: 'string',
    qr: 'qr',
};

// List of table/dbs for data submission service
exports.DB_NAMES = {
    VERIFIER_ADMINDB: 'verifier-db',
}

exports.ERROR_CODES = {
    TIMEOUT: 'ECONNABORTED',
};


// white list consumers
exports.WHITELIST = ['http://localhost*', 'https://localhost*',
    'https://*.acme.com', 'https://*.mybluemix.net'];

