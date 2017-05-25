
import express = require("express");
import objectPath = require("object-path");
import SessionKeys = require("../../SessionKeys");
import winston = require("winston");
import Endpoints = require("../../../endpoints");

export default function (req: express.Request, res: express.Response) {
    const logger: typeof winston = req.app.get("logger");
    logger.debug("Redirection: auth session = %s", JSON.stringify(req.session));
    const redirectUrl: string = objectPath.get(req, SessionKeys.REDIRECT_KEY, Endpoints.FIRST_FACTOR_GET);
    res.json({
        redirection_url: redirectUrl
    });
}