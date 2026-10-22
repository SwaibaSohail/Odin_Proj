const { Router } = require("express");
const clubController = require("../controllers/clubController");
const { requireLogin } = require("../lib/auth");

const clubRouter = Router();

clubRouter.get("/join", requireLogin, clubController.joinGet);
clubRouter.post("/join", requireLogin, clubController.joinPost);
clubRouter.get("/admin", requireLogin, clubController.adminGet);
clubRouter.post("/admin", requireLogin, clubController.adminPost);

module.exports = clubRouter;
