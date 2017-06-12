
import PasswordResetFormPost = require("../../../../src/server/lib/routes/password-reset/form/post");
import LdapClient = require("../../../../src/server/lib/LdapClient");
import sinon = require("sinon");
import winston = require("winston");
import assert = require("assert");
import BluebirdPromise = require("bluebird");

import ExpressMock = require("../../mocks/express");
import { LdapClientMock } from "../../mocks/LdapClient";
import { UserDataStore } from "../../mocks/UserDataStore";
import ServerVariablesMock = require("../../mocks/ServerVariablesMock");

describe("test reset password route", function () {
  let req: ExpressMock.RequestMock;
  let res: ExpressMock.ResponseMock;
  let user_data_store: UserDataStore;
  let ldap_client: LdapClientMock;
  let configuration: any;

  beforeEach(function () {
    req = {
      body: {
        userid: "user"
      },
      app: {
        get: sinon.stub()
      },
      session: {
        auth_session: {
          userid: "user",
          email: "user@example.com",
          first_factor: true,
          second_factor: false
        }
      },
      headers: {
        host: "localhost"
      }
    };

    const options = {
      inMemoryOnly: true
    };

    const mocks = ServerVariablesMock.mock(req.app);
    user_data_store = UserDataStore();
    user_data_store.set_u2f_meta.returns(BluebirdPromise.resolve({}));
    user_data_store.get_u2f_meta.returns(BluebirdPromise.resolve({}));
    user_data_store.issue_identity_check_token.returns(BluebirdPromise.resolve({}));
    user_data_store.consume_identity_check_token.returns(BluebirdPromise.resolve({}));
    mocks.userDataStore = user_data_store;


    configuration = {
      ldap: {
        base_dn: "dc=example,dc=com",
        user_name_attribute: "cn"
      }
    };

    mocks.logger = winston;
    mocks.config = configuration;

    ldap_client = LdapClientMock();
    mocks.ldap = ldap_client;

    res = ExpressMock.ResponseMock();
  });

  describe("test reset password post", () => {
    it("should update the password and reset auth_session for reauthentication", function (done) {
      req.session.auth_session.identity_check = {};
      req.session.auth_session.identity_check.userid = "user";
      req.session.auth_session.identity_check.challenge = "reset-password";
      req.body = {};
      req.body.password = "new-password";

      ldap_client.update_password.returns(BluebirdPromise.resolve());
      ldap_client.bind.returns(BluebirdPromise.resolve());
      res.send = sinon.spy(function () {
        assert.equal(res.status.getCall(0).args[0], 204);
        assert.equal(req.session.auth_session, undefined);
        done();
      });
      PasswordResetFormPost.default(req as any, res as any);
    });

    it("should fail if identity_challenge does not exist", function (done) {
      req.session.auth_session.identity_check = {};
      req.session.auth_session.identity_check.challenge = undefined;
      res.send = sinon.spy(function () {
        assert.equal(res.status.getCall(0).args[0], 403);
        done();
      });
      PasswordResetFormPost.default(req as any, res as any);
    });

    it("should fail when ldap fails", function (done) {
      req.session.auth_session.identity_check = {};
      req.session.auth_session.identity_check.challenge = "reset-password";
      req.body = {};
      req.body.password = "new-password";

      ldap_client.bind.yields(undefined);
      ldap_client.update_password.returns(BluebirdPromise.reject("Internal error with LDAP"));
      res.send = sinon.spy(function () {
        assert.equal(res.status.getCall(0).args[0], 500);
        done();
      });
      PasswordResetFormPost.default(req as any, res as any);
    });
  });
});
