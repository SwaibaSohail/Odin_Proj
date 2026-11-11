const { Router } = require("express");
const usersController = require("../controllers/usersController");

const usersRouter = Router();

usersRouter.get("/", usersController.listUsers);
usersRouter.patch("/me", usersController.updateMe);
usersRouter.put("/me/avatar", usersController.setAvatar);
usersRouter.delete("/me/avatar", usersController.removeAvatar);
usersRouter.get("/:username", usersController.getUser);

module.exports = usersRouter;
