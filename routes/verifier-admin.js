/* eslint-disable max-len */
/**
 * Digital Health Pass 
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 */

const express = require('express');

const router = express.Router();

const requestLogger = require('../middleware/request-logger');
const authorizeUser = require('../middleware/user-authorize');
const controllerAdminApi = require('../controllers/admin-crud');
const userController = require('../controllers/user');

const constants = require('../helpers/constants');
const authStrategy = require('../middleware/auth-strategy');

const checkAuthHealthpassAdmin = authStrategy.getAuthStrategy(constants.HEALTHPASS_ADMIN_SCOPE);
const checkAuthSysAdmin = authStrategy.getAuthStrategy(constants.APP_ID_SCOPES.SYS_ADMIN);
const checkAuthCustomerAdmin = authStrategy.getAuthStrategy(constants.APP_ID_SCOPES.CUSTOMER_ADMIN);
const checkAuthOrgAdmin = authStrategy.getAuthStrategy(constants.APP_ID_SCOPES.ORG_ADMIN);

/* Authorization rules we want
- systemadmin can
  Create/GetAll/Delete/Get customer, Org/Verifier related ops
- role:custadmin (CustomerAdmin) protected routes
  Post/Delete a org
  Get own Customer & Org resource 
  Add user for own, for owned Orgs
- role:orgadmin (OrganizationAdmin) protected routes    
  Post/Revoke/GetAll/GetOne/QRGeneartion verifier
*/


// Customer related
router.post("/customer", checkAuthSysAdmin, requestLogger, controllerAdminApi.addCustomer);
router.delete("/customer/:custId", checkAuthSysAdmin, requestLogger, controllerAdminApi.deleteCustomer);
router.get('/customer', checkAuthSysAdmin, requestLogger, controllerAdminApi.getAllCustomers);
router.get('/customer/:custId', checkAuthSysAdmin, requestLogger, controllerAdminApi.getCustomer);
router.put("/customer/:custId", checkAuthSysAdmin, requestLogger, controllerAdminApi.updateCustomer);

// Orgs related
router.post("/customer/:custId/org", checkAuthCustomerAdmin, requestLogger, authorizeUser, controllerAdminApi.addOrganization);
router.delete("/customer/:custId/org/:orgId", checkAuthCustomerAdmin, requestLogger, authorizeUser, controllerAdminApi.deleteOrg);
router.get("/customer/:custId/org", checkAuthCustomerAdmin, requestLogger, authorizeUser, controllerAdminApi.getAllCustomerOrgs);
router.get("/customer/:custId/org/:orgId", checkAuthOrgAdmin, requestLogger, authorizeUser, controllerAdminApi.getOrg);
router.put("/customer/:custId/org/:orgId", checkAuthOrgAdmin, requestLogger, authorizeUser, controllerAdminApi.updateOrg);

// Verifier related
router.post("/customer/:custId/org/:orgId/verifier", checkAuthOrgAdmin, requestLogger, authorizeUser, controllerAdminApi.addVerifier);
router.get("/customer/:custId/org/:orgId/verifier", checkAuthOrgAdmin, requestLogger, authorizeUser, controllerAdminApi.getAllVerifierForOrg);
router.get("/customer/:custId/org/:orgId/verifier/:verifierId", checkAuthOrgAdmin, requestLogger, authorizeUser, controllerAdminApi.getVerifier);
router.get("/customer/:custId/org/:orgId/verifier/:verifierId/credential", checkAuthOrgAdmin, requestLogger, authorizeUser, controllerAdminApi.getVerifierCredential);
router.post("/customer/:custId/org/:orgId/verifier/:verifierId/revoke", checkAuthOrgAdmin, requestLogger, authorizeUser, controllerAdminApi.revokeVerifierCredential);

// User onboarding routes
// todo authorizeUser
router.post("/onboarding/user", checkAuthCustomerAdmin, requestLogger, userController.onboardUser);
router.delete("/onboarding/user", checkAuthCustomerAdmin, requestLogger, userController.offboardUser);
router.get("/onboarding/user", checkAuthCustomerAdmin, requestLogger, userController.listUsers);
router.put("/onboarding/user", checkAuthCustomerAdmin, requestLogger, userController.resetPassword);
router.post("/onboarding/bootstrap", checkAuthHealthpassAdmin, requestLogger, userController.onboardApp);


/*
// revoke the credential and set the status field it in the DB 
router.post("/customer/:custId/org/:orgId/verifier/:verifierId/revoke", 
    checkAuthOrgAdmin, requestLogger, authorizeUser,
);
*/

/** User management: Proposed permissions
 SysAdmin
    "/onboarding/user"
    
 checkAuthCustomerAdmin
    "/onboarding/customer/:custId/user"
    "/onboarding/customer/:custId/org/:orgId/user" 

 checkAuthOrgAdmin   
   no user creation
 */
module.exports = router;
