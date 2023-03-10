/**
 * Digital Health Pass 
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 */
const bodyParser = require('body-parser');
const cors = require('cors');
const express = require('express');
const fs = require('fs');
const https = require('https');
const morgan = require('morgan');
const passport = require('passport');
const path = require('path');
// const swaggerUI = require('swagger-ui-express');
const helmet = require('helmet');
const appConfig = require('./config');
const dbModels = require('./models/dbmodels');
const migrateAtStartup = require('./dbmigrate/migrateAtStartup');

const healthRoutes = require('./routes/health');
const verifierAdminRoutes = require('./routes/verifier-admin');
const userRoutes = require('./routes/users');
const profileRoutes = require('./routes/profile');

const constants = require('./helpers/constants');
const tlsHelper = require('./helpers/tls-helper');
const Logger = require('./config/logger');
// const { config } = require('process');

const logger = new Logger('app');
const app = express();
const port = process.env.PORT || process.env.VCAP_APP_PORT || 3000;
const contextRoot = process.env.CONTEXT_ROOT || '';
let useHTTPS = false;
let serverCert;
let serverKey;

logger.info(`NODE JS RUNNING ON ${process.version}`);
logger.info(`PORT = ${port}`);
logger.info(`process.env.APP_ID_AUTH_SERVER_HOST = ${process.env.APP_ID_AUTH_SERVER_HOST}`);
logger.info(`process.env.APP_ID_TENANT_ID = ${process.env.APP_ID_TENANT_ID}`);
logger.info(`process.env.AUTH_STRATEGY = ${process.env.AUTH_STRATEGY}`);
logger.info(`process.env.NODE_ENV = ${process.env.NODE_ENV}, process.env.DEPLOY_ENV = ${process.env.DEPLOY_ENV}`);
logger.info(`Using POSTGRES_HOST = ${process.env.POSTGRES_HOST} \
    port = ${process.env.POSTGRES_PORT} dbname = ${process.env.POSTGRES_DB_NAME}`);

if (process.env.USE_HTTPS && (process.env.USE_HTTPS === 'true' || process.env.USE_HTTPS === 'TRUE')) {
    useHTTPS = true;
    const tlsFolder = process.env.TLS_FOLDER_PATH || './config/tls';
    serverCert = path.resolve(tlsFolder, 'cert/server.cert');
    serverKey = path.resolve(tlsFolder, 'key/server.key');

    logger.info(`process.env.USE_HTTPS = ${process.env.USE_HTTPS}`);
    logger.info(`Using server.key & server.cert from folder = ${tlsFolder}`);
    logger.info(`server cert file = ${serverCert}`);
    logger.info(`server key file = ${serverKey}`);
}

process.on('warning', (warning) => {
    logger.warn('XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
    logger.warn(`Warning name: ${warning.name}`);
    logger.warn(`Warning message: ${warning.message}`);
    logger.warn(`Stack trace: ${warning.stack}`);
    logger.warn('XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
});

process.on('unhandledRejection', (reason, p) => {
    logger.warn('XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
    logger.warn(`Unhandled Rejection at promise: ${JSON.stringify(p)} reason: ${reason}`);
    logger.warn('XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
});

process.on('uncaughtException', (err) => {
    logger.warn('XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
    logger.warn(`Uncaught exception = ${err}`);
    logger.warn(`Uncaught stack = ${err.stack}`);
    logger.warn('XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
});

const onStartUp = async (err) => {
    if (err) {
        logger.error(`Error starting server: ${err}`);
    }
    else {
        try {
            // destructive param: drops all table & recreate
            const recreateDB = appConfig.recreateDBOnStartup || false;
            if (appConfig.upgradeDBOnStartup && !recreateDB)
                migrateAtStartup();
            await dbModels.init(recreateDB);

        } catch (error) {
            const errMsg = `Error in schema init in DB server: ${error}`;
            logger.error(errMsg);
            // eslint-disable-next-line no-process-exit
            process.exit(1);
        }
    }

    logger.info(`Server running on port ${port}`);
};

app.use(helmet());

const corsOptions = {
    origin(origin, callback) {
        if (constants.WHITELIST.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(null, false);
        }
    },
    optionsSuccessStatus: 200, // some legacy browsers 
};
app.use(cors(corsOptions));

// TODO: may want to change to short or tiny
app.use(morgan('dev'));
app.use(
    bodyParser.urlencoded({
        extended: false,
    })
);
app.use(bodyParser.json());
app.use(passport.initialize());



// routes which should handle requests
app.use(`${contextRoot}/health`, healthRoutes);
app.use(`${contextRoot}/users`, userRoutes);
app.use(`${contextRoot}/admin`, verifierAdminRoutes);
app.use(`${contextRoot}/profile`, profileRoutes);

app.use((req, res, next) => {
    const error = new Error('No route found');
    error.status = 404;
    next(error);
});

// eslint-disable-next-line no-unused-vars
app.use((error, req, res, next) => {
    res.status(error.status || 500);
    res.json({
        error: {
            message: error.message,
        },
    });
});

if (useHTTPS) {
    const foundKeyFiles = tlsHelper.validateSSLFiles(serverKey, serverCert);
    if (foundKeyFiles) {
        const options = {
            key: fs.readFileSync(serverKey),
            cert: fs.readFileSync(serverCert),
            secureOptions: tlsHelper.getSecureOptions(),
            ciphers: tlsHelper.getCiphersForServerOptions(),
            honorCipherOrder: true,
        };
        https.createServer(options, app).listen(port, onStartUp);
    }
} else {
    app.listen(port, onStartUp);
}

module.exports = app;
