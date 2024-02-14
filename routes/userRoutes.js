// userRoutes.js
const express = require("express");
const authController = require("../controllers/authController");
const friendController = require("../controllers/friendController");

const router = express.Router();

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.post("/getUser", authController.protect, authController.getUser);
router.post("/forgotPassword", authController.forgotPassword);
router.post(
  "/sendFriendRequest",
  authController.protect,
  friendController.sendFriendRequest
);
router.post("/viewFriendRequests", friendController.viewFriendRequests);
router.post(
  "/acceptFriendRequest",
  authController.protect,
  friendController.acceptFriendRequest
);
router.post(
  "/denyFriendRequest",
  authController.protect,
  friendController.rejectFriendRequest
);
router.patch("/resetPassword/:token", authController.resetPassword);

module.exports = router;
