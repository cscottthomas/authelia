
import UserDataStore from "../../../../UserDataStore";

import objectPath = require("object-path");
import u2f_common = require("../U2FCommon");
import BluebirdPromise = require("bluebird");
import express = require("express");
import U2f = require("u2f");
import FirstFactorBlocker from "../../../FirstFactorBlocker";
import ErrorReplies = require("../../../../ErrorReplies");

export default FirstFactorBlocker(handler);

function handler(req: express.Request, res: express.Response): BluebirdPromise<void> {
    const logger = req.app.get("logger");
    const challenge: string =
        objectPath.get<express.Request, string>(req, "session.auth_session.identity_check.challenge");
    if (challenge != "u2f-register") {
        res.status(403);
        res.send();
        return;
    }

    const u2f: typeof U2f = req.app.get("u2f");
    const appid: string = u2f_common.extract_app_id(req);

    logger.debug("U2F register_request: headers=%s", JSON.stringify(req.headers));
    logger.info("U2F register_request: Starting registration for appId %s", appid);

    return BluebirdPromise.resolve(u2f.request(appid))
        .then(function (registrationRequest: U2f.Request) {
            logger.debug("U2F register_request: registrationRequest = %s", JSON.stringify(registrationRequest));
            req.session.auth_session.register_request = registrationRequest;
            res.json(registrationRequest);
            return BluebirdPromise.resolve();
        })
        .catch(ErrorReplies.replyWithError500(res, logger));
}