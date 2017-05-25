
import BluebirdPromise = require("bluebird");
import express = require("express");
import objectPath = require("object-path");

import FirstFactorValidator = require("./FirstFactorValidator");

export function validate(req: express.Request): BluebirdPromise<void> {
    return FirstFactorValidator.validate(req)
        .then(function () {
            if (!objectPath.has(req, "session.auth_session.second_factor"))
                return BluebirdPromise.reject("No second factor variable");

            return BluebirdPromise.resolve();
        });
}