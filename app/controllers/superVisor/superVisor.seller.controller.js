const db = require("../../models");
const User = db.user;
const mongoose = require("mongoose");

var bcrypt = require("bcryptjs");

// Create
// exports.addseller = async (req, res) => {
//   try {
//     const hashedPassword = await bcrypt.hash(req.body.password, 10);
//     const user = new User({
//       ...req.body,
//       password: hashedPassword,
//       role: "seller",
//       subAdminId: req.userId,
//     });
//     await user.save();
//     res.status(201).send(user);
//   } catch (err) {
//     res.status(400).send(err);
//   }
// };

// Read //tested
exports.getseller = async (req, res) => {
  try {
    // Fetch sellers and populate the supervisor's name
    const users= await User.find({ superVisorId: req.userId, role: "seller" }).populate("superVisorId")
    // const users = await User.find({ superVisorId: req.userId, role: "seller" }).populate("superVisorId");
    // console.log(users)
    const subAdminId=mongoose.Types.ObjectId(users[0]?.subAdminId)

    let subAdmin={}
    if(subAdminId){
      subAdmin=await User.findById(subAdminId)
    }

 
    // Fetch sub-admin details (companyName, bonusFlag)
    const superVisor = await User.findOne(
      { _id: req.userId }
    );
    // console.log(users)
   
    // console.log(subAdmin.companyName)

    res.send({
      success: true,
      users: users.map((user) => ({
        _id: user._id,
        userName: user.userName,
        superVisorId:superVisor?._id || null, // Ensure superVisorId is present
        superVisorName:superVisor?.userName || "N/A", // Display supervisor's name, fallback to N/A
        isActive: user.isActive,
        imei: user.imei,
      })),
      companyName:subAdmin?.companyName,
      bonusFlag: superVisor?.bonusFlag,
    });
  } catch (err) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: err.message });
  }
};

// Update
// exports.updateseller = async (req, res) => {
//   const updates = Object.keys(req.body);
//   try {
//     const user = await User.findById(req.params.id);
//     if (!user) {
//       res.status(404).send();
//     }
//     updates.forEach((update) => {
//       if (`${req.body[update]}` != "") {
//         // only update if the field exists in the req.body object
//         user[update] = req.body[update];
//       }
//     });
//     if (req.body.password) {
//       user.password = await bcrypt.hash(req.body.password, 10);
//     }
//     await user.save();
//     res.send(user);
//   } catch (err) {
//     res.status(400).send(err);
//   }
// };

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
// exports.deleteseller = async (req, res) => {
//   try {
//     const user = await User.findByIdAndDelete(req.params.id);
//     if (!user) {
//       res.status(404).send();
//       return;
//     }
//     res.send(user);
//   } catch (err) {
//     res.status(500).send(err);
//   }
// };
