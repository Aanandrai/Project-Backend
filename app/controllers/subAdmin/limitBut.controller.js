const mongoose = require("mongoose");
const db = require("../../models");
const LimitBut = db.limits;


// Create
//this is updated for supervisor limit
exports.addLimitBut = async (req, res) => {
  const { lotteryCategoryName, limits, seller ,superVisor} = req.body;
  try {
    let newLimit = null;
    
      if (seller) {

        newLimit = new LimitBut({
          subAdmin: req.userId,
          lotteryCategoryName,
          limits,
          seller,
        });
      } else {
    
        if(superVisor){

          newLimit = new LimitBut({
            subAdmin: req.userId,
            superVisor,
            lotteryCategoryName,
            limits,
          });

        }
        else{
          newLimit = new LimitBut({
            subAdmin: req.userId,
            lotteryCategoryName,
            limits,
          });
        }

        
      }

    await newLimit.save();
    newLimit = await LimitBut.findById(newLimit._id).populate("seller");

    res.send(newLimit);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

// Read //it have to modify for seller / supervisor // subadmin
//Now it is for all 
exports.getLimitButAll = async (req, res) => {
  try {
    let limits=null
    limits = await LimitBut.find({
    subAdmin: req.userId,
    superVisor: { $exists: false }, // Ensure superVisor does not exist
    seller: { $exists: false } // Ensure seller does not exist
  })

    res.json(limits);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.getLimitButSeller = async (req, res) => {
  try {
    let limits = null;
    limits = await LimitBut.find({
      subAdmin: req.userId,
      superVisor: { $exists: false },
      seller:{$exists:true} // Ensure superVisor does not exist
    }).populate("seller");

    res.json(limits);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.getLimitButSuperVisor = async (req, res) => {
  try {
    let limits = null;
    limits = await LimitBut.find({
      subAdmin: req.userId,
      superVisor:{$exists:true},
      seller: { $exists: false } // Ensure seller does not exist
    }).populate("superVisor");

    res.json(limits);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

// Update
exports.updateLimitBut = async (req, res) => {
  const { id } = req.params;
  const { lotteryCategoryName, limits, seller, general } = req.body;

  try {
    let limit = null;
   
      limit = await LimitBut.findById(id);



    if (!limit) {
      return res.status(404).json({ message: "Limit not found" });
    }

    limit.lotteryCategoryName = lotteryCategoryName;
    limit.limits = limits;

    if (seller == "") {
      limit.seller = null;
    } else {
      limit.seller = seller;
    }

    limit = await limit.save();

    
      limit = await LimitBut.findById(id).populate("seller");
    

    res.json(limit);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

// DELETE a block number by ID
exports.deleteLimitBut = async (req, res) => {
  const { id } = req.params;
  try {
    let limit = null;

   
      limit = await LimitBut.findById(id);

    if (!limit) {
      return res.status(404).json({ message: "Limit not found" });
    }

    await limit.remove();

    res.json({ message: "Limit removed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};
