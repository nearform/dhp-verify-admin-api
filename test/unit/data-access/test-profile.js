/* eslint-disable max-len */
/* eslint-disable max-lines-per-function */
/**
 * Digital Health Pass 
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 */

const sinon = require('sinon');
const { expect } = require('chai');
const httpMocks = require('node-mocks-http');

const { createProfile, getMasterProfile, getProfile, addConfig, deleteConfig, deleteProfile } = require('../../../controllers/profile');
const profileDataAccess = require('../../../data-access/profile');
const Logger = require('../../../config/logger');
const constants = require('../../../helpers/constants');

const sandbox = sinon.createSandbox();

describe.only('createProfile()', () => {
    let req;
    let res;

    beforeEach(() => {
        req = httpMocks.createRequest();
        res = httpMocks.createResponse();
        req.headers[constants.REQUEST_HEADERS.TRANSACTION_ID] = 'test-TXID';
        res.json = sandbox.spy();

        sandbox.stub(Logger.prototype, 'debug');
        sandbox.stub(Logger.prototype, 'response');
        sandbox.stub(Logger.prototype, 'info');
        sandbox.stub(Logger.prototype, 'error');
    });

    afterEach(() => {
        sandbox.restore();
    });


    it('should return 400 status code if not specify profileId or updatedBy in request body', async () => {

        await createProfile(req, res);

        expect(res.statusCode).to.be.equal(400);
        expect(res.json.calledOnce).to.be.true;
        expect(res.json.firstCall.args[0]).to.have.property('error');
        expect(res.json.firstCall.args[0].error).to.have.property('message');

    });

    it('should return 409 status code if profileId already exist in DB', async () => {

        req.body = {
            profileId: 'test-profile-id',
            updatedBy: 'test-updatedby'
        };
        const resObj = [{ profileId: 'some test profileId' }];

        sandbox.stub(profileDataAccess, 'getProfile').resolves(resObj);

        await createProfile(req, res);

        expect(res.statusCode).to.be.equal(409);
        expect(res.json.calledOnce).to.be.true;
        expect(res.json.firstCall.args[0]).to.have.property('message');
    });

    it('should return 201 status code if record successfully created', async () => {

        req.body = {
            profileId: 'test-profile-id',
            updatedBy: 'test-updatedby'
        };
        const resObj = null;
        const result = { id: 'test-id' };

        sandbox.stub(profileDataAccess, 'getProfile').resolves(resObj);
        sandbox.stub(profileDataAccess, 'createProfile').resolves(result);

        await createProfile(req, res);

        expect(res.statusCode).to.be.equal(201);
        expect(res.json.calledOnce).to.be.true;
        expect(res.json.firstCall.args[0]).to.have.property('message');
    });

    it('should return 500 status code if throw error during db call', async () => {

        req.body = {
            profileId: 'test-profile-id',
            updatedBy: 'test-updatedby'
        };
        const resObj = null;

        sandbox.stub(profileDataAccess, 'getProfile').rejects(resObj);
        await createProfile(req, res);

        expect(res.statusCode).to.be.equal(500);
        expect(res.json.calledOnce).to.be.true;
        expect(res.json.firstCall.args[0]).to.have.property('error');
        expect(res.json.firstCall.args[0].error).to.have.property('message');

    });

});

describe.only('getMasterProfile()', () => {
    let req;
    let res;

    beforeEach(() => {
        req = httpMocks.createRequest();
        res = httpMocks.createResponse();
        req.headers[constants.REQUEST_HEADERS.TRANSACTION_ID] = 'test-TXID';

        res.json = sandbox.spy();
        sandbox.stub(Logger.prototype, 'debug');
        sandbox.stub(Logger.prototype, 'response');
        sandbox.stub(Logger.prototype, 'info');
        sandbox.stub(Logger.prototype, 'error');
    });

    afterEach(() => {
        sandbox.restore();
    });

    it('should return 200 status code if successfully get master profile', async () => {

        const resObj = [{ profileId: '-1' }];

        sandbox.stub(profileDataAccess, 'getProfile').resolves(resObj);

        await getMasterProfile(req, res);

        expect(res.statusCode).to.be.equal(200);
        expect(res.json.calledOnce).to.be.true;
        expect(res.json.firstCall.args[0]).to.have.property('result');
    });

    it('should return 404 status code if not found master profile', async () => {

        const resObj = [];

        sandbox.stub(profileDataAccess, 'getProfile').resolves(resObj);

        await getMasterProfile(req, res);

        expect(res.statusCode).to.be.equal(404);
        expect(res.json.calledOnce).to.be.true;
        expect(res.json.firstCall.args[0]).to.have.property('message');
    });

    it('should return 500 status code if throw error during db call', async () => {

        const resObj = null;

        sandbox.stub(profileDataAccess, 'getProfile').rejects(resObj);
        await getMasterProfile(req, res);

        expect(res.statusCode).to.be.equal(500);
        expect(res.json.calledOnce).to.be.true;
        expect(res.json.firstCall.args[0]).to.have.property('error');
        expect(res.json.firstCall.args[0].error).to.have.property('message');

    });
});

describe.only('getProfile()', () => {
    let req;
    let res;

    beforeEach(() => {
        req = httpMocks.createRequest();
        res = httpMocks.createResponse();
        req.headers[constants.REQUEST_HEADERS.TRANSACTION_ID] = 'test-TXID';

        res.json = sandbox.spy();
        sandbox.stub(Logger.prototype, 'debug');
        sandbox.stub(Logger.prototype, 'response');
        sandbox.stub(Logger.prototype, 'info');
        sandbox.stub(Logger.prototype, 'error');
    });

    afterEach(() => {
        sandbox.restore();
    });

    it('should return 403 status code if try to get master profile', async () => {

        req.params = {
            profileId: '-1'
        };

        await getProfile(req, res);

        expect(res.statusCode).to.be.equal(403);
        expect(res.json.calledOnce).to.be.true;
        expect(res.json.firstCall.args[0]).to.have.property('message');
    });

    it('should return 200 status code if suceessfully get record', async () => {

        const resObj = [{ profileId: 'some test profileId' }];

        sandbox.stub(profileDataAccess, 'getProfile').resolves(resObj);

        await getProfile(req, res);

        expect(res.statusCode).to.be.equal(200);
        expect(res.json.calledOnce).to.be.true;
        expect(res.json.firstCall.args[0]).to.have.property('result');
    });

    it('should return 404 status code if no record found', async () => {

        const resObj = [];

        sandbox.stub(profileDataAccess, 'getProfile').resolves(resObj);

        await getProfile(req, res);

        expect(res.statusCode).to.be.equal(404);
        expect(res.json.calledOnce).to.be.true;
        expect(res.json.firstCall.args[0]).to.have.property('message');
    });

    it('should return 500 status code if throw error during db call', async () => {

        const resObj = null;

        sandbox.stub(profileDataAccess, 'getProfile').rejects(resObj);
        await getProfile(req, res);

        expect(res.statusCode).to.be.equal(500);
        expect(res.json.calledOnce).to.be.true;
        expect(res.json.firstCall.args[0]).to.have.property('error');
        expect(res.json.firstCall.args[0].error).to.have.property('message');

    });
});

describe.only('addConfig()', () => {
    let req;
    let res;

    beforeEach(() => {
        req = httpMocks.createRequest();
        res = httpMocks.createResponse();
        req.headers[constants.REQUEST_HEADERS.TRANSACTION_ID] = 'test-TXID';

        res.json = sandbox.spy();
        sandbox.stub(Logger.prototype, 'debug');
        sandbox.stub(Logger.prototype, 'response');
        sandbox.stub(Logger.prototype, 'info');
        sandbox.stub(Logger.prototype, 'error');
    });

    afterEach(() => {
        sandbox.restore();
    });

    it('should return 400 status code if not property is missing in request body', async () => {

        await addConfig(req, res);

        expect(res.statusCode).to.be.equal(400);
        expect(res.json.calledOnce).to.be.true;
        expect(res.json.firstCall.args[0]).to.have.property('error');
        expect(res.json.firstCall.args[0].error).to.have.property('message');

    });

    it('should return 409 status code if record already exist in DB', async () => {

        req.body = {
            profileId: 'test-profile-id',
            updatedBy: 'test-updatedby',
            configId: 'test-config-id',
            version: 'latest'
        };
        const resObj = false;

        sandbox.stub(profileDataAccess, 'updateOrCreateProfile').resolves(resObj);

        await addConfig(req, res);

        expect(res.statusCode).to.be.equal(409);
        expect(res.json.calledOnce).to.be.true;
        expect(res.json.firstCall.args[0]).to.have.property('message');
    });

    it('should return 409 status code if record already exist in DB', async () => {

        req.body = {
            profileId: 'test-profile-id',
            updatedBy: 'test-updatedby',
            configId: 'test-config-id',
            version: 'latest'
        };
        const updateObj = true;
        const resObj = [{ profileId: 'some test profileId' }];

        sandbox.stub(profileDataAccess, 'updateOrCreateProfile').resolves(updateObj);
        sandbox.stub(profileDataAccess, 'getProfile').resolves(resObj);

        await addConfig(req, res);

        expect(res.statusCode).to.be.equal(201);
        expect(res.json.calledOnce).to.be.true;
        expect(res.json.firstCall.args[0]).to.have.property('result');
    });

    it('should return 500 status code if throw error during db call', async () => {

        req.body = {
            profileId: 'test-profile-id',
            updatedBy: 'test-updatedby',
            configId: 'test-config-id',
            version: 'latest'
        };
        const resObj = null;

        sandbox.stub(profileDataAccess, 'getProfile').rejects(resObj);
        await addConfig(req, res);

        expect(res.statusCode).to.be.equal(500);
        expect(res.json.calledOnce).to.be.true;
        expect(res.json.firstCall.args[0]).to.have.property('error');
        expect(res.json.firstCall.args[0].error).to.have.property('message');

    });

});

describe.only('deleteConfig()', () => {
    let req;
    let res;

    beforeEach(() => {
        req = httpMocks.createRequest();
        res = httpMocks.createResponse();
        req.headers[constants.REQUEST_HEADERS.TRANSACTION_ID] = 'test-TXID';

        res.json = sandbox.spy();
        sandbox.stub(Logger.prototype, 'debug');
        sandbox.stub(Logger.prototype, 'response');
        sandbox.stub(Logger.prototype, 'info');
        sandbox.stub(Logger.prototype, 'error');
    });

    afterEach(() => {
        sandbox.restore();
    });

    it('should return 400 status code if not property is missing in request body', async () => {

        await deleteConfig(req, res);

        expect(res.statusCode).to.be.equal(400);
        expect(res.json.calledOnce).to.be.true;
        expect(res.json.firstCall.args[0]).to.have.property('error');
        expect(res.json.firstCall.args[0].error).to.have.property('message');

    });

    it('should return 200 status code if record deleted', async () => {
        req.body = {
            profileId: 'test-profile-id',
            updatedBy: 'test-updatedby',
            configId: 'test-config-id',
            version: 'latest'
        };
        const delCount = 1;
        const resObj = [{ profileId: 'some test profileId' }];

        sandbox.stub(profileDataAccess, 'deleteProfileConfig').resolves(delCount);
        sandbox.stub(profileDataAccess, 'getProfile').resolves(resObj);

        await deleteConfig(req, res);

        expect(res.statusCode).to.be.equal(200);
        expect(res.json.calledOnce).to.be.true;
        expect(res.json.firstCall.args[0]).to.have.property('result');
    });

    it('should return 404 status code if record not found', async () => {
        req.body = {
            profileId: 'test-profile-id',
            updatedBy: 'test-updatedby',
            configId: 'test-config-id',
            version: 'latest'
        };
        const delCount = 0;

        sandbox.stub(profileDataAccess, 'deleteProfileConfig').resolves(delCount);

        await deleteConfig(req, res);

        expect(res.statusCode).to.be.equal(404);
        expect(res.json.calledOnce).to.be.true;
        expect(res.json.firstCall.args[0]).to.have.property('message');
    });

    it('should return 500 status code if throw error during db call', async () => {

        req.body = {
            profileId: 'test-profile-id',
            updatedBy: 'test-updatedby',
            configId: 'test-config-id',
            version: 'latest'
        };
        const resObj = null;

        sandbox.stub(profileDataAccess, 'deleteProfileConfig').rejects(resObj);
        await deleteConfig(req, res);

        expect(res.statusCode).to.be.equal(500);
        expect(res.json.calledOnce).to.be.true;
        expect(res.json.firstCall.args[0]).to.have.property('error');
        expect(res.json.firstCall.args[0].error).to.have.property('message');

    });
});

describe.only('deleteProfile()', () => {
    let req;
    let res;

    beforeEach(() => {
        req = httpMocks.createRequest();
        res = httpMocks.createResponse();
        req.headers[constants.REQUEST_HEADERS.TRANSACTION_ID] = 'test-TXID';

        res.json = sandbox.spy();
        sandbox.stub(Logger.prototype, 'debug');
        sandbox.stub(Logger.prototype, 'response');
        sandbox.stub(Logger.prototype, 'info');
        sandbox.stub(Logger.prototype, 'error');
    });

    afterEach(() => {
        sandbox.restore();
    });

    it('should return 403 status code if not allowed to delete', async () => {
        req.params = {
            profileId: '-1'
        }

        await deleteProfile(req, res);

        expect(res.statusCode).to.be.equal(403);
        expect(res.json.calledOnce).to.be.true;
        expect(res.json.firstCall.args[0]).to.have.property('message');
    });

    it('should return 200 status code if deleted successfully', async () => {
        req.params = {
            profileId: 'test-profile-id'
        };
        const delCount = 1;

        sandbox.stub(profileDataAccess, 'deleteProfile').resolves(delCount);
        await deleteProfile(req, res);

        expect(res.statusCode).to.be.equal(200);
        expect(res.json.calledOnce).to.be.true;
        expect(res.json.firstCall.args[0]).to.have.property('message');
    });

    it('should return 404 status code if no record found', async () => {
        req.params = {
            profileId: 'test-profile-id'
        };
        const delCount = 0;

        sandbox.stub(profileDataAccess, 'deleteProfile').resolves(delCount);
        await deleteProfile(req, res);

        expect(res.statusCode).to.be.equal(404);
        expect(res.json.calledOnce).to.be.true;
        expect(res.json.firstCall.args[0]).to.have.property('message');
    });

    it('should return 500 status code if throw error during db call', async () => {

        req.body = {
            profileId: 'test-profile-id',
            updatedBy: 'test-updatedby',
            configId: 'test-config-id',
            version: 'latest'
        };
        const resObj = null;

        sandbox.stub(profileDataAccess, 'deleteProfile').rejects(resObj);
        await deleteProfile(req, res);

        expect(res.statusCode).to.be.equal(500);
        expect(res.json.calledOnce).to.be.true;
        expect(res.json.firstCall.args[0]).to.have.property('error');
        expect(res.json.firstCall.args[0].error).to.have.property('message');

    });

});
