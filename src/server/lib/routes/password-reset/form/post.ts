
import express = require("express");
import BluebirdPromise = require("bluebird");
import objectPath = require("object-path");
import exceptions = require("../../../Exceptions");
import ServerVariables = require("../../../ServerVariables");

import Constants = require("./../constants");

export default function (req: express.Request, res: express.Response) {
    const logger = ServerVariables.getLogger(req.app);
    const ldap = ServerVariables.getLdapClient(req.app);

    const new_password = objectPath.get<express.Request, string>(req, "body.password");
    const userid = objectPath.get<express.Request, string>(req, "session.auth_session.identity_check.userid");

    const challenge = objectPath.get(req, "session.auth_session.identity_check.challenge");
    if (challenge != Constants.CHALLENGE) {
        res.status(403);
        res.send();
        return;
    }

    logger.info("POST reset-password: User %s wants to reset his/her password", userid);

    ldap.update_password(userid, new_password)
        .then(function () {
            logger.info("POST reset-password: Password reset for user %s", userid);
            objectPath.set(req, "session.auth_session", undefined);
            res.status(204);
            res.send();
        })
        .catch(function (err: Error) {
            logger.error("POST reset-password: Error while resetting the password of user %s. %s", userid, err);
            res.status(500);
            res.send();
        });
}
