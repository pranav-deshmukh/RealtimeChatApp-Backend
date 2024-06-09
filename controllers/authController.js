const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const crypto = require("crypto");
const sendMail = require("../utils/email");

const signToken = (id) => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  res.status(201).json({
    status: statusCode,
    token,
    data: {
      user,
    },
  });
};

exports.getUser = async (req, res, next) => {
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
    console.log(currentUser.acceptFriendRequests.length);
    return res.status(200).json({
      status: "success",
      userId: userId,
      email: currentUser.email,
      name: currentUser.name,
      friendRequests: currentUser.acceptFriendRequests.length,
      friends: currentUser.friends,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ status: "error", message: "Internal server error." });
  }
};

exports.signup = async (req, res, next) => {
  try {
    const newUser = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      passwordConfirm: req.body.passwordConfirm,
    });

    createSendToken(newUser, 201, res);
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ status: "fail", message: err.message });
    }

    next();
  }
};

exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password)
    return next(
      res
        .status(400)
        .json({ status: "fail", message: "Please provide email and password" })
    );

  const user = await User.findOne({ email: email }).select("+password");
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(
      res
        .status(401)
        .json({ status: "fail", message: "Incorrect email or password" })
    );
  }

  createSendToken(user, 200, res);
};

exports.forgotPassword = async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(
      res
        .status(404)
        .json({ status: "fail", message: "There is no user with this email" })
    );
  }
  const resetToken = user.createPasswordToken();
  await user.save({ validateBeforeSave: false });

  const resetURL = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgot you password? Submit a PATCH request with your new password and passwordConfirm to ${resetURL}.\nIf you didn't forget your password, please ignore this email!!`;

  try {
    await sendMail({
      email: user.email,
      subject: "Your password reset token ( valid for 10 min )",
      message,
    });

    res.status(200).json({
      status: "success",
      message: "Token sent to email!",
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    console.log(error);
    return next(
      res.status(500).json({
        status: "fail",
        message: "there was an error sending email. Try again later!",
      })
    );
  }
};

exports.resetPassword = async (req, res, next) => {
  //1) Get user based on token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }, //to check if refresh token is still valid
  });
  //2) If token is not expired and there is user, set new password
  if (!user) {
    return next(
      res.status(500).json({
        status: "fail",
        message: "Token is invalid or has expired!",
      })
    );
  }
  console.log(req.body.password);
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  const token = signToken(user._id);
  res.status(200).json({
    status: "success",
    token,
  });
};

exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      status: "fail",
      message: "You are not logged in! Please log in to get access.",
    });
  }

  let decoded;
  try {
    decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        status: "fail",
        message: "Your token has expired. Please login again!",
      });
    } else if (error.name === "JsonWebTokenError") {
      console.log("Invalid token");
      return res.status(401).json({
        status: "fail",
        message: "Invalid token. Please login again!",
      });
    } else {
      console.error("An error occurred:", error.message);
      return res.status(401).json({
        status: "fail",
        message: "Your token is invalid login again",
      });
    }
  }

  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return res.status(401).json({
      status: "fail",
      message: "The User belonging to this token no longer exists",
    });
  }

  // Check if user changed password after the token was issued
  // if (currentUser.changedPasswordAfter(decoded.iat)) {
  //   return res.status(401).json({
  //     status: "fail",
  //     message: "User recently changed password! Please login again",
  //   });
  // }

  // Grant access to protected route
  req.user = currentUser;
  next();
};

exports.logout = async (req, res) => {
  res.cookie("jwt", "", { maxAge: 1 });
  res.redirect("/");
};
