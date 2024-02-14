const User = require("../models/userModel");
require("dotenv").config();
const jwt = require("jsonwebtoken");

exports.sendFriendRequest = async (req, res) => {
  console.log(req.body);
  const { token, email } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = decoded.id;
    const currentUser = await User.findById(userId);

    const targetUser = await User.findOne({ email: email.toLowerCase() });

    if (!targetUser) {
      return res
        .status(404)
        .json({ status: "error", message: "User not found." });
    }

    if (!currentUser.friends.includes(targetUser.email)) {
      if (!currentUser.sentFriendRequests.includes(targetUser.email)) {
        currentUser.sentFriendRequests.push(targetUser.email);
        targetUser.acceptFriendRequests.push(currentUser.email);
        await currentUser.save();
        await targetUser.save();

        return res
          .status(200)
          .json({ status: "success", message: "Friend request sent." });
      } else {
        return res
          .status(400)
          .json({ status: "error", message: "Friend request already sent." });
      }
    } else {
      return res
        .status(400)
        .json({ status: "error", message: "Already friends." });
    }
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ status: "error", message: "Internal server error." });
  }
};

exports.viewFriendRequests = async (req, res) => {
  const { token } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = decoded.id;
    const currentUser = await User.findById(userId);

    if (!currentUser) {
      return res
        .status(404)
        .json({ status: "error", message: "User not found." });
    }

    const acceptFriendRequests = currentUser.acceptFriendRequests;

    return res.status(200).json({ status: "success", acceptFriendRequests });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ status: "error", message: "Internal server error." });
  }
};

exports.acceptFriendRequest = async (req, res) => {
  const { token, email } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = decoded.id;
    const currentUser = await User.findById(userId);

    const targetUser = await User.findOne({ email: email.toLowerCase() });

    if (!targetUser) {
      return res
        .status(404)
        .json({ status: "error", message: "User not found." });
    }

    if (!currentUser.friends.includes(targetUser.email)) {
      if (currentUser.acceptFriendRequests.includes(targetUser.email)) {
        currentUser.friends.push(targetUser.email);
        targetUser.friends.push(currentUser.email);
        targetUser.sentFriendRequests = targetUser.sentFriendRequests.filter(
          (friendId) => friendId !== currentUser.email
        );

        currentUser.acceptFriendRequests =
          currentUser.acceptFriendRequests.filter(
            (friendId) => friendId !== targetUser.email
          );

        await currentUser.save();
        await targetUser.save();

        return res
          .status(200)
          .json({ status: "success", message: "Friend request accepted." });
      } else {
        return res.status(400).json({
          status: "error",
          message: "No friend requests from this id",
        });
      }
    } else {
      return res
        .status(400)
        .json({ status: "error", message: "Already friends." });
    }
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ status: "error", message: "Internal server error." });
  }
};

exports.rejectFriendRequest = async (req, res) => {
  const { token, email } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = decoded.id;
    const currentUser = await User.findById(userId);

    const targetUser = await User.findOne({ email: email.toLowerCase() });

    if (!targetUser) {
      return res
        .status(404)
        .json({ status: "error", message: "User not found." });
    }

    if (!currentUser.friends.includes(targetUser.email)) {
      if (currentUser.acceptFriendRequests.includes(targetUser.email)) {
        currentUser.acceptFriendRequests =
          currentUser.acceptFriendRequests.filter(
            (friendId) => friendId !== targetUser.email
          );

        await currentUser.save();

        return res
          .status(200)
          .json({ status: "success", message: "Friend request denied." });
      } else {
        return res.status(400).json({
          status: "error",
          message: "No friend requests from this id",
        });
      }
    } else {
      return res
        .status(400)
        .json({ status: "error", message: "Already friends." });
    }
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ status: "error", message: "Internal server error." });
  }
};
