
import express = require("express");
import BluebirdPromise = require("bluebird");
import FirstFactorValidator = require("../FirstFactorValidator");
import Exceptions = require("../Exceptions");
import ErrorReplies = require("../ErrorReplies");
import objectPath = require("object-path");

type Handler = (req: express.Request, res: express.Response) => BluebirdPromise<void>;

export default function (callback: Handler): Handler {
    return function (req: express.Request, res: express.Response): BluebirdPromise<void> {
        const logger = req.app.get("logger");
        logger.debug("AuthSession is %s", objectPath.get(req, "session.auth_session"));
        return FirstFactorValidator.validate(req)
            .then(function () {
                return callback(req, res);
            })
            .catch(Exceptions.FirstFactorValidationError, ErrorReplies.replyWithError401(res, logger));
    };
}