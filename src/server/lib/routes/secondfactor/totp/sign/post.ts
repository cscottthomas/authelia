
import exceptions = require("../../../../Exceptions");
import objectPath = require("object-path");
import express = require("express");
import { TOTPSecretDocument } from "../../../../UserDataStore";
import BluebirdPromise = require("bluebird");
import FirstFactorBlocker from "../../../FirstFactorBlocker";
import Endpoints = require("../../../../../endpoints");
import redirect from "../../redirect";
import ErrorReplies = require("../../../../ErrorReplies");

const UNAUTHORIZED_MESSAGE = "Unauthorized access";

export default FirstFactorBlocker(handler);

export function handler(req: express.Request, res: express.Response): BluebirdPromise<void> {
  const logger = req.app.get("logger");
  const userid = objectPath.get(req, "session.auth_session.userid");
  logger.info("POST 2ndfactor totp: Initiate TOTP validation for user %s", userid);

  const token = req.body.token;
  const totpValidator = req.app.get("totp validator");
  const userDataStore = req.app.get("user data store");

  logger.debug("POST 2ndfactor totp: Fetching secret for user %s", userid);
  return userDataStore.get_totp_secret(userid)
    .then(function (doc: TOTPSecretDocument) {
      logger.debug("POST 2ndfactor totp: TOTP secret is %s", JSON.stringify(doc));
      return totpValidator.validate(token, doc.secret.base32);
    })
    .then(function () {
      logger.debug("POST 2ndfactor totp: TOTP validation succeeded");
      objectPath.set(req, "session.auth_session.second_factor", true);
      redirect(req, res);
      return BluebirdPromise.resolve();
    })
    .catch(exceptions.InvalidTOTPError, ErrorReplies.replyWithError401(res, logger))
    .catch(ErrorReplies.replyWithError500(res, logger));
}
