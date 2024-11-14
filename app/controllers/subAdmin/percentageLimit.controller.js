// 181014
const mongoose = require("mongoose");
const db = require("../../models");

const LimitPercentage = db.LimitPercentage

//testeds
exports.addPercentageLimit=async(req,res)=>{
    try{
        const subAdminId = mongoose.Types.ObjectId(req.userId);
        const {lotteryCategoryName}=req.body
        

        req.body.subAdmin=subAdminId

        const percentageLimit=await LimitPercentage.findOne({
                subAdmin:subAdminId,
                lotteryCategoryName:lotteryCategoryName
                })
               

        if(percentageLimit!=null|| percentageLimit!=undefined){
            res.status(400).json({message:"percentage limit already exist for this lotteryCategory"})
        }

        const limit=new LimitPercentage(req.body)
        limit.save()

        res.status(200).json(limit)

    }catch(err){
       
        res.status(500).send({ message: err })
    }
}


exports.updatePercentageLimit=async(req,res)=>{
    try{
        const {id}=req.params
        const subAdminId = mongoose.Types.ObjectId(req.userId);
        const limit = await LimitPercentage.findByIdAndUpdate(id, req.body, { new: true });


        if(!limit){
            res.status(404).json({message:"This percentage limit not found"})
        }

        res.status(200).json(limit)


    }catch(err){
        res.status(500).json({ message: 'Server Error' })
    }
}

exports.getPercentageLimit=async(req,res)=>{
    try{
        const limits=await LimitPercentage.find({subAdmin:req.userId})
        if(limits.length==0){
            res.status(404).status({message:"No percentageLimit is found for this Admin"})
        }

        res.status(200).json(limits)
    }catch(err){
        res.status(500).json(err)
    }
}

// Delete
exports.deletePercentageLimit = async (req, res) => {
  try {
    const percentagelimit = await LimitPercentage.findByIdAndDelete(req.params.id);
    res.send(percentagelimit);
  } catch (error) {
    res.status(500).send(error);
  }
};
