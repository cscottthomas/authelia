
import { Winston } from "winston";
import objectPath = require("object-path");
import BluebirdPromise = require("bluebird");
import express = require("express");
import AccessController from "../../access_control/AccessController";
import exceptions = require("../../Exceptions");
import winston = require("winston");
import SessionKeys = require("../../SessionKeys");
import AuthenticationValidator = require("../../AuthenticationValidator");
import ErrorReplies = require("../../ErrorReplies");

function verify_filter(req: express.Request, res: express.Response) {
  const logger: typeof winston = req.app.get("logger");
  const accessController: AccessController = req.app.get("access controller");

  logger.debug("Verify: headers are %s", JSON.stringify(req.headers));

  objectPath.set(req, SessionKeys.REDIRECT_KEY, "https://" + req.headers["host"] + req.headers["x-original-uri"]);

  return AuthenticationValidator.validate(req)
    .then(function () {
      const username = objectPath.get<express.Request, string>(req, "session.auth_session.userid");
      const groups = objectPath.get<express.Request, string[]>(req, "session.auth_session.groups");

      const host = objectPath.get<express.Request, string>(req, "headers.host");
      const domain = host.split(":")[0];

      const isAllowed = accessController.isDomainAllowedForUser(domain, username, groups);
      if (!isAllowed) return BluebirdPromise.reject(
        new exceptions.DomainAccessDenied("User '" + username + "' does not have access to " + domain));

      if (!req.session.auth_session.first_factor ||
        !req.session.auth_session.second_factor)
        return BluebirdPromise.reject(new exceptions.AccessDeniedError("First or second factor not validated"));

      return BluebirdPromise.resolve();
    });
}

export default function (req: express.Request, res: express.Response) {
  const logger: Winston = req.app.get("logger");
  verify_filter(req, res)
    .then(function () {
      res.status(204);
      res.send();
    })
    .catch(ErrorReplies.replyWithError401(res, logger));
}

