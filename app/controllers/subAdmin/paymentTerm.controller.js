const db = require("../../models");
const mongoose = require("mongoose");
const PaymentTerm = db.paymentTerm;
const moment = require("moment-timezone");
const haitiTimezone = "America/Port-au-Prince";

// Create //tested
exports.addPaymentTerm = async (req, res) => {
  try {
    const { lotteryCategoryName, conditions ,seller ,superVisor} = req.body;
    subAdmin = req.userId;

    if(conditions.length==0){
      res.status(400).send({message:"conditions can not de empty array"})
    }

    const today = moment().tz(haitiTimezone).format("yyyy-MM-DD");
    
      
    let check={
      subAdmin:subAdmin,
      date:today
    }

    if(lotteryCategoryName){
      check.lotteryCategoryName=lotteryCategoryName
    }else{
      check.lotteryCategoryName={$exists:false}
    }

    if(seller){
      check.seller=mongoose.Types.ObjectId(seller)
    }else if(superVisor){
      check.superVisor=mongoose.Types.ObjectId(superVisor)
    }else{
      check.seller={$exists:false}
      check.superVisor={$exists:false}
    }

    const paymentTermsCheck = await PaymentTerm.findOne(check);
    console.log(paymentTermsCheck)

    if(paymentTermsCheck) {
      res.status(400).send({message: "Already exist by LotteryCategoryName! You have to update"});
      return;
    }

    
    const paymentTermData = {
      subAdmin,
      conditions,
      date: today,
    };
    
    if (lotteryCategoryName) {
      paymentTermData.lotteryCategoryName = lotteryCategoryName;
    }
    
    if (seller) {
      paymentTermData.seller = seller;
    }else if (superVisor) {
      paymentTermData.superVisor = superVisor;
    }
    
    const paymentTerm = new PaymentTerm(paymentTermData);
   
    await paymentTerm.save();
    res.send(paymentTerm);
  } catch (error) {
    console.log(error)
    res.status(400).send(error);
  }
};


// Read //tested
exports.readPaymentTermBySubAdminIdAll = async (req, res) => {
  try {
    const lotteryCategoryName=req.query.lotteryCategoryName
    const paymentTerms = await PaymentTerm.find({
      subAdmin: req.userId,
    });
    res.send(paymentTerms);
  } catch (error) {
    res.status(500).send(error);
  }
};

// Update //tested
exports.updatePaymentTerm = async (req, res) => {
  try {
    const paymentTerm = await PaymentTerm.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.send(paymentTerm);
  } catch (error) {
    res.status(400).send(error);
  }
};

// Delete
exports.deletePaymentTerm = async (req, res) => {
  try {
    const paymentTerm = await PaymentTerm.findByIdAndDelete(req.params.id);
    res.send(paymentTerm);
  } catch (error) {
    res.status(500).send(error);
  }
};
