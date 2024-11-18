const db = require("../../models");
const User = db.user;

var bcrypt = require("bcryptjs");

// Create //tested
exports.addseller = async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    superVisorId = req.body.superVisorId;
    if (superVisorId === "") {
      delete req.body.superVisorId; // Remove if it's an empty string
    }

    const user = new User({
      ...req.body,
      password: hashedPassword,
      role: "seller",
      subAdminId: req.userId,
    });
    await user.save();
    res.status(201).send(user);
  } catch (err) {
    res.status(400).send(err);
  }
};

// Read //tested
exports.getseller = async (req, res) => {
  try {
    // Fetch sellers and populate the supervisor's name
    const users = await User.find({ subAdminId: req.userId, role: "seller" })
      .populate("superVisorId", "userName") // Populate supervisor's userName field
      .exec();

    // Fetch sub-admin details (companyName, bonusFlag)
    const subadmin = await User.findOne(
      { _id: req.userId },
      { companyName: 1, bonusFlag: 1 }
    );

    res.send({
      success: true,
      users: users.map((user) => ({
        _id: user._id,
        userName: user.userName,
        superVisorId: user.superVisorId?._id || null, // Ensure superVisorId is present
        superVisorName: user.superVisorId?.userName || "None", // Display supervisor's name, fallback to N/A
        isActive: user.isActive,
        imei: user.imei,
      })),
      companyName: subadmin?.companyName,
      bonusFlag: subadmin?.bonusFlag,
    });
  } catch (err) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: err.message });
  }
};

exports.getsellerWhoNotHaveSupervisor = async (req, res) => {
  try {
    // Fetch active sellers without a supervisor
    const users = await User.find({
      subAdminId: req.userId,
      role: "seller",
      superVisorId: { $exists: false }, // Ensure superVisorId does not exist
      isActive: true, // Ensure the seller is active
    }).exec();

    // Fetch sub-admin details (companyName, bonusFlag)
    const subadmin = await User.findOne(
      { _id: req.userId },
      { companyName: 1, bonusFlag: 1 }
    );

    res.send({
      success: true,
      users: users.map((user) => ({
        _id: user._id,
        userName: user.userName,
        isActive: user.isActive,
        imei: user.imei,
      })),
      companyName: subadmin?.companyName,
      bonusFlag: subadmin?.bonusFlag,
    });
  } catch (err) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: err.message });
  }
};

// Update //tested
exports.updateseller = async (req, res) => {
  const updates = Object.keys(req.body);
  try {
    const user = await User.findById(req.params.id).populate("superVisorId");
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    const superVisorStatus = await User.findById(user.superVisorId).select('isActive');

    let responseSent = false;  // Flag to track if a response is already sent

    updates.forEach((update) => {
      if (responseSent) return;  // If response is already sent, skip further processing

      if (update === "isActive" && req.body[update] === true && superVisorStatus.isActive === false) {
        responseSent = true;  // Mark that response is sent
        return res.status(400).send({ message: "Supervisor is not active" });
      } else if (`${req.body[update]}` !== "") {
        // only update if the field exists in the req.body object
        user[update] = req.body[update];
      } else if (update === "superVisorId") {
        user.superVisorId = undefined;
      }
    });

    // If there's a password to update, handle it outside the loop
    if (req.body.password) {
      user.password = await bcrypt.hash(req.body.password, 10);
    }

    if (!responseSent) {
      await user.save();
      return res.send(user);  // Send the final response only once
    }
  } catch (err) {
    console.log(err);
    
      return res.status(400).send(err);  // Send error response only if not already sent
  }
};


// Update
exports.updateBonusFlag = async (req, res) => {
  const bonusFlag = req.body.bonusFlag;
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).send();
    }

    user.bonusFlag = bonusFlag;

    await user.save();
    res.send(user);
  } catch (err) {
    res.status(400).send(err);
  }
};

// Delete
exports.deleteseller = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      res.status(404).send();
      return;
    }
    res.send(user);
  } catch (err) {
    res.status(500).send(err);
  }
};
