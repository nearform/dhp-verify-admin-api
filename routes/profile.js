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
const profileController = require('../controllers/profile');
const authorizeProfile = require('../middleware/profile-authorize');
const constants = require('../helpers/constants');
const authStrategy = require('../middleware/auth-strategy');

const checkAuthSysAdmin = authStrategy.getAuthStrategy(constants.APP_ID_SCOPES.SYS_ADMIN);
const checkAuthCustomerAdmin = authStrategy.getAuthStrategy(constants.APP_ID_SCOPES.CUSTOMER_ADMIN);
const checkAuthOrgAdmin = authStrategy.getAuthStrategy(constants.APP_ID_SCOPES.ORG_ADMIN);

// Profile related
router.post("/:profileId", checkAuthCustomerAdmin, requestLogger, authorizeProfile, profileController.createProfile);

router.get("/:profileId", checkAuthOrgAdmin, requestLogger, authorizeProfile, profileController.getProfile);

router.patch("/:profileId/addconfig", checkAuthCustomerAdmin, requestLogger, authorizeProfile, profileController.addConfig);

router.patch("/:profileId/deleteconfig", checkAuthCustomerAdmin, requestLogger, authorizeProfile, profileController.deleteConfig);

router.delete("/:profileId", checkAuthSysAdmin, requestLogger, profileController.deleteProfile);

module.exports = router;
