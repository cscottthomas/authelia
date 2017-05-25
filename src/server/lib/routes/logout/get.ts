
import express = require("express");

export default function(req: express.Request, res: express.Response) {
  const redirect_param = req.query.redirect;
  const redirect_url = redirect_param || "/";
  req.session.auth_session = {
    first_factor: false,
    second_factor: false
  };
  res.redirect(redirect_url);
}