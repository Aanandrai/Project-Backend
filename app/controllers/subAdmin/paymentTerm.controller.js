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
      return;
    }

    const today = moment().tz(haitiTimezone).format("YYYY-MM-DD");
    
      
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
    const fromDate=req.query.fromDate

    const paymentTerms = await PaymentTerm.find({
      subAdmin: req.userId,
      superVisor: { $exists: false }, // Ensure superVisor does not exist
      seller: { $exists: false },// Ensure seller does not exist
      date: new Date(fromDate)
    }).populate("subAdmin")
    res.send(paymentTerms);
  } catch (error) {
    console.log(error)
    res.status(500).send(error);
  }
};



exports.readPaymentTermOfSuperVisor = async (req, res) => {
  try {
    const fromDate=req.query.fromDate
    const lotteryCategoryName=req.query.lotteryCategoryName
    const superVisor=req.query.superVisor

    if(!superVisor){  
      res.status(400).send({message:"SuperVisor is required"})
      return  
    }


    let check={
      subAdmin:req.userId,
      date:new Date(fromDate),
      superVisor:mongoose.Types.ObjectId(superVisor),
      seller: { $exists: false }
    }

    if(lotteryCategoryName){
      check.lotteryCategoryName=lotteryCategoryName
    }


    const paymentTerms = await PaymentTerm.find(check).populate(superVisor);
    res.send(paymentTerms);
  } catch (error) {
    res.status(500).send(error);
  }
};


exports.readPaymentTermOfSeller = async (req, res) => {
  try {
    const fromDate=req.query.fromDate
    const lotteryCategoryName=req.query.lotteryCategoryName
    const seller=req.query.seller
   
    if(!seller){
      res.status(400).send({message:"Seller is required"})
      return  
    }


    let check={
      subAdmin:req.userId,
      date:new Date(fromDate),
      superVisor:{ $exists: false },
      seller: mongoose.Types.ObjectId(seller)
    }

    if(lotteryCategoryName){
      check.lotteryCategoryName=lotteryCategoryName
    }


    const paymentTerms = await PaymentTerm.find(check).populate(seller);
    res.send(paymentTerms);
  } catch (error) {
    res.status(500).send(error);
  }
};


// Update //tested
exports.updatePaymentTerm = async (req, res) => {
  try {

    const tempPaymentTerm=await PaymentTerm.findById(req.params.id)
    if(!tempPaymentTerm){
      res.status(400).send({message:"PaymentTerm not found"})
      return;
    }

    let paymentTermDate = moment(tempPaymentTerm.date).startOf('day');

      // Get the current date in Haiti timezone at the start of the day
      let currentDate = moment().tz(haitiTimezone).startOf('day');

      // Log the two moment objects for debugging
      // console.log('Payment Term Date:', paymentTermDate.format());
      // console.log('Current Date:', currentDate.format());

      // Compare the two dates (ignoring time)
      if (!paymentTermDate.isSame(currentDate, 'day')) {
        res.status(400).send({ message: "You can not update past date" });
        return;
      }

    const paymentTerm = await PaymentTerm.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.send(paymentTerm);
  } catch (error) {
    console.log(error)
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
