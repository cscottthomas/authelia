
import { UserConfiguration } from "./../../types/Configuration";
import { GlobalDependencies } from "../../types/Dependencies";
import AuthenticationRegulator from "./AuthenticationRegulator";
import UserDataStore from "./UserDataStore";
import ConfigurationAdapter from "./ConfigurationAdapter";
import { NotifierFactory } from "./notifiers/NotifierFactory";
import TOTPValidator from "./TOTPValidator";
import TOTPGenerator from "./TOTPGenerator";
import RestApi from "./RestApi";
import { LdapClient } from "./LdapClient";
import BluebirdPromise = require("bluebird");

import * as Express from "express";
import * as BodyParser from "body-parser";
import * as Path from "path";
import * as http from "http";

import AccessController from "./access_control/AccessController";

export default class Server {
  private httpServer: http.Server;

  start(yaml_configuration: UserConfiguration, deps: GlobalDependencies): BluebirdPromise<void> {
    const config = ConfigurationAdapter.adapt(yaml_configuration);

    const view_directory = Path.resolve(__dirname, "../views");
    const public_html_directory = Path.resolve(__dirname, "../public_html");
    const datastore_options = {
      directory: config.store_directory,
      inMemory: config.store_in_memory
    };

    const app = Express();
    app.use(Express.static(public_html_directory));
    app.use(BodyParser.urlencoded({ extended: false }));
    app.use(BodyParser.json());

    app.use(function (req, res, next) {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
      next();
    });

    app.set("trust proxy", 1); // trust first proxy

    app.use(deps.session({
      secret: config.session.secret,
      resave: false,
      saveUninitialized: true,
      cookie: {
        secure: false,
        maxAge: config.session.expiration,
        domain: config.session.domain
      },
    }));

    app.set("views", view_directory);
    app.set("view engine", "pug");

    // by default the level of logs is info
    deps.winston.level = config.logs_level;
    console.log("Log level = ", deps.winston.level);

    const five_minutes = 5 * 60;
    const userDataStore = new UserDataStore(datastore_options, deps.nedb);
    const regulator = new AuthenticationRegulator(userDataStore, five_minutes);
    const notifier = NotifierFactory.build(config.notifier, deps.nodemailer);
    const ldap = new LdapClient(config.ldap, deps.ldapjs, deps.winston);
    const accessController = new AccessController(config.access_control, deps.winston);
    const totpValidator = new TOTPValidator(deps.speakeasy);
    const totpGenerator = new TOTPGenerator(deps.speakeasy);

    app.set("logger", deps.winston);
    app.set("ldap", ldap);
    app.set("totp validator", totpValidator);
    app.set("totp generator", totpGenerator);
    app.set("u2f", deps.u2f);
    app.set("user data store", userDataStore);
    app.set("notifier", notifier);
    app.set("authentication regulator", regulator);
    app.set("config", config);
    app.set("access controller", accessController);

    RestApi.setup(app, userDataStore, deps.winston);

    return new BluebirdPromise<void>((resolve, reject) => {
      this.httpServer = app.listen(config.port, function (err: string) {
        console.log("Listening on %d...", config.port);
        resolve();
      });
    });
  }

  stop() {
    this.httpServer.close();
  }
}

