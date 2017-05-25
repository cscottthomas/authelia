import sinon = require("sinon");
import winston = require("winston");
import assert = require("assert");
import BluebirdPromise = require("bluebird");

import { Identity } from "../../../../../../src/types/Identity";
import RegistrationHandler from "../../../../../../src/server/lib/routes/secondfactor/u2f/identity/RegistrationHandler";

import ExpressMock = require("../../../../mocks/express");
import UserDataStoreMock = require("../../../../mocks/UserDataStore");

describe("test register handler", function () {
  let req: ExpressMock.RequestMock;
  let res: ExpressMock.ResponseMock;
  let user_data_store: UserDataStoreMock.UserDataStore;

  beforeEach(function () {
    req = ExpressMock.RequestMock;
    req.app = {};
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

    user_data_store = UserDataStoreMock.UserDataStore();
    user_data_store.set_u2f_meta = sinon.stub().returns(BluebirdPromise.resolve({}));
    user_data_store.get_u2f_meta = sinon.stub().returns(BluebirdPromise.resolve({}));
    user_data_store.issue_identity_check_token = sinon.stub().returns(BluebirdPromise.resolve({}));
    user_data_store.consume_identity_check_token = sinon.stub().returns(BluebirdPromise.resolve({}));
    req.app.get.withArgs("user data store").returns(user_data_store);

    res = ExpressMock.ResponseMock();
    res.send = sinon.spy();
    res.json = sinon.spy();
    res.status = sinon.spy();
  });

  describe("test u2f registration check", test_registration_check);

  function test_registration_check() {
    it("should fail if first_factor has not been passed", function () {
      req.session.auth_session.first_factor = false;
      return new RegistrationHandler().preValidationInit(req as any)
        .then(function () { return BluebirdPromise.reject(new Error("It should fail")); })
        .catch(function (err: Error) {
          return BluebirdPromise.resolve();
        });
    });

    it("should fail if userid is missing", function (done) {
      req.session.auth_session.first_factor = false;
      req.session.auth_session.userid = undefined;

      new RegistrationHandler().preValidationInit(req as any)
        .catch(function (err: Error) {
          done();
        });
    });

    it("should fail if email is missing", function (done) {
      req.session.auth_session.first_factor = false;
      req.session.auth_session.email = undefined;

      new RegistrationHandler().preValidationInit(req as any)
        .catch(function (err: Error) {
          done();
        });
    });

    it("should succeed if first factor passed, userid and email are provided", function (done) {
      new RegistrationHandler().preValidationInit(req as any)
        .then(function (identity: Identity) {
          done();
        });
    });
  }
});
