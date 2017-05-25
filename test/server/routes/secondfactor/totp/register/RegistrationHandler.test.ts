import sinon = require("sinon");
import winston = require("winston");
import RegistrationHandler from "../../../../../../src/server/lib/routes/secondfactor/totp/identity/RegistrationHandler";
import { Identity } from "../../../../../../src/types/Identity";
import assert = require("assert");
import BluebirdPromise = require("bluebird");

import ExpressMock = require("../../../../mocks/express");
import UserDataStoreMock = require("../../../../mocks/UserDataStore");

describe("test totp register", function () {
  let req: ExpressMock.RequestMock;
  let res: ExpressMock.ResponseMock;
  let userDataStore: UserDataStoreMock.UserDataStore;
  const registrationHandler: RegistrationHandler = new RegistrationHandler();

  beforeEach(function () {
    req = ExpressMock.RequestMock();
    req.app.get = sinon.stub();
    req.app.get.withArgs("logger").returns(winston);
    req.session = {};
    req.session.auth_session = {};
    req.session.auth_session.userid = "user";
    req.session.auth_session.email = "user@example.com";
    req.session.auth_session.first_factor = true;
    req.session.auth_session.second_factor = false;
    req.headers = {};
    req.headers.host = "localhost";

    const options = {
      inMemoryOnly: true
    };

    userDataStore = UserDataStoreMock.UserDataStore();
    userDataStore.set_u2f_meta = sinon.stub().returns(BluebirdPromise.resolve({}));
    userDataStore.get_u2f_meta = sinon.stub().returns(BluebirdPromise.resolve({}));
    userDataStore.issue_identity_check_token = sinon.stub().returns(BluebirdPromise.resolve({}));
    userDataStore.consume_identity_check_token = sinon.stub().returns(BluebirdPromise.resolve({}));
    userDataStore.set_totp_secret = sinon.stub().returns(BluebirdPromise.resolve({}));
    req.app.get.withArgs("user data store").returns(userDataStore);

    res = ExpressMock.ResponseMock();
  });

  describe("test totp registration check", test_registration_check);

  function test_registration_check() {
    it("should fail if first_factor has not been passed", function () {
      req.session.auth_session.first_factor = false;
      return registrationHandler.preValidationInit(req as any)
        .then(function () { return BluebirdPromise.reject(new Error("It should fail")); })
        .catch(function (err: Error) {
          return BluebirdPromise.resolve();
        });
    });

    it("should fail if userid is missing", function (done) {
      req.session.auth_session.first_factor = false;
      req.session.auth_session.userid = undefined;

      registrationHandler.preValidationInit(req as any)
        .catch(function (err: Error) {
          done();
        });
    });

    it("should fail if email is missing", function (done) {
      req.session.auth_session.first_factor = false;
      req.session.auth_session.email = undefined;

      registrationHandler.preValidationInit(req as any)
        .catch(function (err: Error) {
          done();
        });
    });

    it("should succeed if first factor passed, userid and email are provided", function (done) {
      registrationHandler.preValidationInit(req as any)
        .then(function (identity: Identity) {
          done();
        });
    });
  }
});
