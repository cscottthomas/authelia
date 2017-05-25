
import sinon = require("sinon");
import BluebirdPromise = require("bluebird");
import assert = require("assert");
import U2FRegisterPost = require("../../../../../../src/server/lib/routes/secondfactor/u2f/register/post");
import winston = require("winston");

import ExpressMock = require("../../../../mocks/express");
import UserDataStoreMock = require("../../../../mocks/UserDataStore");
import U2FMock = require("../../../../mocks/u2f");
import U2f = require("u2f");

describe("test u2f routes: register", function () {
  let req: ExpressMock.RequestMock;
  let res: ExpressMock.ResponseMock;
  let userDataStore: UserDataStoreMock.UserDataStore;

  beforeEach(function () {
    req = ExpressMock.RequestMock();
    req.app = {};
    req.app.get = sinon.stub();
    req.app.get.withArgs("logger").returns(winston);
    req.session = {};
    req.session.auth_session = {};
    req.session.auth_session.userid = "user";
    req.session.auth_session.first_factor = true;
    req.session.auth_session.second_factor = false;
    req.session.auth_session.identity_check = {};
    req.session.auth_session.identity_check.challenge = "u2f-register";
    req.session.auth_session.register_request = {};
    req.headers = {};
    req.headers.host = "localhost";

    const options = {
      inMemoryOnly: true
    };

    userDataStore = UserDataStoreMock.UserDataStore();
    userDataStore.set_u2f_meta = sinon.stub().returns(BluebirdPromise.resolve({}));
    userDataStore.get_u2f_meta = sinon.stub().returns(BluebirdPromise.resolve({}));
    req.app.get.withArgs("user data store").returns(userDataStore);

    res = ExpressMock.ResponseMock();
    res.send = sinon.spy();
    res.json = sinon.spy();
    res.status = sinon.spy();
  });

  describe("test registration", test_registration);


  function test_registration() {
    it("should save u2f meta and return status code 200", function () {
      const expectedStatus = {
        keyHandle: "keyHandle",
        publicKey: "pbk",
        certificate: "cert"
      };
      const u2f_mock = U2FMock.U2FMock();
      u2f_mock.checkRegistration.returns(BluebirdPromise.resolve(expectedStatus));

      req.session.auth_session.register_request = {};
      req.app.get.withArgs("u2f").returns(u2f_mock);
      return U2FRegisterPost.default(req as any, res as any)
        .then(function () {
          assert.equal("user", userDataStore.set_u2f_meta.getCall(0).args[0]);
          assert.equal(req.session.auth_session.identity_check, undefined);
        });
    });

    it("should return unauthorized on finishRegistration error", function () {
      const user_key_container = {};
      const u2f_mock = U2FMock.U2FMock();
      u2f_mock.checkRegistration.returns({ errorCode: 500 });

      req.session.auth_session.register_request = "abc";
      req.app.get.withArgs("u2f").returns(u2f_mock);
      return U2FRegisterPost.default(req as any, res as any)
        .then(function () { return BluebirdPromise.reject(new Error("It should fail")); })
        .catch(function () {
          assert.equal(500, res.status.getCall(0).args[0]);
          return BluebirdPromise.resolve();
        });
    });

    it("should return 403 when register_request is not provided", function () {
      const user_key_container = {};
      const u2f_mock = U2FMock.U2FMock();
      u2f_mock.checkRegistration.returns(BluebirdPromise.resolve());

      req.session.auth_session.register_request = undefined;
      req.app.get.withArgs("u2f").returns(u2f_mock);
      return U2FRegisterPost.default(req as any, res as any)
        .then(function () { return BluebirdPromise.reject(new Error("It should fail")); })
        .catch(function () {
          assert.equal(403, res.status.getCall(0).args[0]);
          return BluebirdPromise.resolve();
        });
    });

    it("should return forbidden error when no auth request has been initiated", function () {
      const user_key_container = {};
      const u2f_mock = U2FMock.U2FMock();
      u2f_mock.checkRegistration.returns(BluebirdPromise.resolve());

      req.session.auth_session.register_request = undefined;
      req.app.get.withArgs("u2f").returns(u2f_mock);
      return U2FRegisterPost.default(req as any, res as any)
        .then(function () { return BluebirdPromise.reject(new Error("It should fail")); })
        .catch(function () {
          assert.equal(403, res.status.getCall(0).args[0]);
          return BluebirdPromise.resolve();
        });
    });

    it("should return forbidden error when identity has not been verified", function () {
      req.session.auth_session.identity_check = undefined;
      return U2FRegisterPost.default(req as any, res as any)
        .then(function () { return BluebirdPromise.reject(new Error("It should fail")); })
        .catch(function () {
          assert.equal(403, res.status.getCall(0).args[0]);
          return BluebirdPromise.resolve();
        });
    });
  }
});

