
import BluebirdPromise = require("bluebird");
import express = require("express");
import objectPath = require("object-path");
import Exceptions = require("./Exceptions");

export function validate(req: express.Request): BluebirdPromise<void> {
    if (!objectPath.has(req, "session.auth_session.userid")
        || !objectPath.has(req, "session.auth_session.first_factor"))
        return BluebirdPromise.reject(new Exceptions.FirstFactorValidationError("First factor has not been validated yet."));

    return BluebirdPromise.resolve();
}