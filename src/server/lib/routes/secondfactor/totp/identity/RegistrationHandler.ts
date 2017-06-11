
import express = require("express");
import BluebirdPromise = require("bluebird");
import objectPath = require("object-path");

import { Identity } from "../../../../../../types/Identity";
import { IdentityValidable } from "../../../../IdentityCheckMiddleware";
import { PRE_VALIDATION_TEMPLATE } from "../../../../IdentityCheckPreValidationTemplate";
import Constants = require("../constants");
import Endpoints = require("../../../../../endpoints");
import ErrorReplies = require("../../../../ErrorReplies");

import FirstFactorValidator = require("../../../../FirstFactorValidator");


export default class RegistrationHandler implements IdentityValidable {
  challenge(): string {
    return Constants.CHALLENGE;
  }

  private retrieveIdentity(req: express.Request): BluebirdPromise<Identity> {
    const userid = objectPath.get<express.Request, string>(req, "session.auth_session.userid");
    const email = objectPath.get<express.Request, string>(req, "session.auth_session.email");

    if (!(userid && email)) {
      return BluebirdPromise.reject(new Error("User ID or email is missing"));
    }

    const identity = {
      email: email,
      userid: userid
    };
    return BluebirdPromise.resolve(identity);
  }

  preValidationInit(req: express.Request): BluebirdPromise<Identity> {
    const that = this;
    return FirstFactorValidator.validate(req)
      .then(function () {
        return that.retrieveIdentity(req);
      });
  }

  preValidationResponse(req: express.Request, res: express.Response) {
    res.render(PRE_VALIDATION_TEMPLATE);
  }

  postValidationInit(req: express.Request) {
    return FirstFactorValidator.validate(req);
  }

  postValidationResponse(req: express.Request, res: express.Response) {
    const logger = req.app.get("logger");
    const userid = objectPath.get(req, "session.auth_session.identity_check.userid");
    const challenge = objectPath.get(req, "session.auth_session.identity_check.challenge");

    if (challenge != Constants.CHALLENGE || !userid) {
      res.status(403);
      res.send();
      return;
    }

    const userDataStore = req.app.get("user data store");
    const totpGenerator = req.app.get("totp generator");
    const secret = totpGenerator.generate();

    logger.debug("POST new-totp-secret: save the TOTP secret in DB");
    userDataStore.set_totp_secret(userid, secret)
      .then(function () {
        objectPath.set(req, "session", undefined);

        res.render(Constants.TEMPLATE_NAME, {
          base32_secret: secret.base32,
          otpauth_url: secret.otpauth_url,
          login_endpoint: Endpoints.FIRST_FACTOR_GET
        });
      })
      .catch(ErrorReplies.replyWithError500(res, logger));
  }

  mailSubject(): string {
    return "Register your TOTP secret key";
  }
}