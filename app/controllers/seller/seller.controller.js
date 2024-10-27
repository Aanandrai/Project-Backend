// 181024
const mongoose = require("mongoose");
const moment = require("moment-timezone");
const config = require("../../config/auth.config");
const db = require("../../models");
const User = db.user;
const Ticket = db.ticket;
const WinningNumber = db.winningNumber;
const Lottery = db.lotteryCategory;
const Limits = db.limits;
const LimitCalc = db.limitCalc;
const BlockNumber = db.blockNumber;
const LimitPercentage = db.LimitPercentage

const browserify_zlib = require("browserify-zlib");

var jwt = require("jsonwebtoken");
var bcrypt = require("bcryptjs");


// Set the timezone to Haiti
const haitiTimezone = "America/Port-au-Prince";

//tested
exports.signIn = async (req, res) => {
  try {
    const { imei, password } = req.body;
   
    const user = await User.findOne({ imei }).populate("subAdminId");

    if (!user) {
      // res.send(encoding({ success: false, message: "User not found!" }));
      res.send({ success: false, message: "User not found!" });
      return;
    }

    if (!user.isActive) {
      // res.send(encoding({ success: false, message: "This user locked now!" }));
      res.send({ success: false, message: "This user locked now!" });
      return;
    }

    if (!user.subAdminId.isActive) {
      // res.send(
      //   encoding({
      //     success: false,
      //     message: "Votre compagnie est deconnecée",
      //   })
      // );
      res.send({
          success: false,
          message: "Votre compagnie est deconnecée",
        }
      );
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      // res.send(
      //   encoding({ success: false, message: "Mot de passe incorrecte" })
      // );

      res.send({ success: false, message: "Mot de passe incorrecte" });
      return;
    }

    var token = jwt.sign({ id: user.id }, config.secret, {
      expiresIn: "10h",
    });

    req.session.token = token;
    // res.send(
    //   encoding({
    //     success: true,
    //     token: token,
    //     userName: user.userName,
    //     companyName: user.subAdminId.companyName,
    //     phoneNumber: user.subAdminId.phoneNumber,
    //     address: user.subAdminId.address,
    //     sellerId: user._id,
    //     subAdminId: user.subAdminId._id,
    //   })
    // );
    
    res.send({
        success: true,
        token: token,
        userName: user.userName,
        companyName: user.subAdminId.companyName,
        phoneNumber: user.subAdminId.phoneNumber,
        address: user.subAdminId.address,
        sellerId: user._id,
        subAdminId: user.subAdminId._id,
      });

  } catch (err) {
    console.log(err);
    res.status(500).send({ message: err });
  }
};

exports.signOut = async (req, res) => {
  try {
    req.session = null;
    res.send({ success: true, message: "You've been signed out!" });
  } catch (err) {
    this.next(err);
  }
};

//Create ticket //basic tested
exports.newTicket = async (req, res) => {
  try {
    const { lotteryCategoryName } = req.body;
    const sellerId=req.userId
    // const numbers = JSON.parse(req.body.numbers);
    const numbers = req.body.numbers;
    const today = moment().tz(haitiTimezone).format("yyyy-MM-DD");
    const currentTime = moment().tz(haitiTimezone).format("HH:mm");


    const lotInfo = await Lottery.findOne({ lotteryName: lotteryCategoryName });

    if (
      moment(currentTime, "HH:mm").isAfter(
        moment(lotInfo.startTime, "HH:mm")
      ) &&
      moment(currentTime, "HH:mm").isBefore(moment(lotInfo.endTime, "HH:mm"))
    ) {


      const { success, error, limit_data, block_data, new_numbers } =
        await requestTicketCheck(lotteryCategoryName, sellerId, numbers ,lotInfo.startTime);

      if (!success) {
        console.log("ticket check error: ", error);
        
        // return res.send(
        //   encoding({
        //     success: false,
        //     message: "ticket save failed! try again!",
        //   })
        // );
        return res.send(
          {
            success: false,
            message: "ticket save failed! try again!",
          }
        );
      }

      if (new_numbers.length > 0) {
        const ticket = new Ticket({
          seller: sellerId,
          lotteryCategoryName,
          numbers: new_numbers,
          date: today,
          isDelete: false,
        });

        await ticket.save((err, savedTicket) => {
          if (err) {
            console.log("new ticket data error :", err);
            // res.send(
            //   encoding({
            //     success: false,
            //     message: "new ticket create failed! please try again!",
            //   })
            // );
            res.send(
              {
                success: false,
                message: "new ticket create failed! please try again!",
              }
            );
            return;
          } else {
            const newId = savedTicket.ticketId;
            // res.send(
            //   encoding({
            //     success: true,
            //     message: "success",
            //     ticketId: newId,
            //     numbers: new_numbers,
            //     limit_data,
            //     block_data,
            //   })
            // );
            res.send(
             {
                success: true,
                message: "success",
                ticketId: newId,
                numbers: new_numbers,
                limit_data,
                block_data,
              }
            );
            return;
          }
        });
      } else {
        // res.send(
        //   encoding({
        //     success: true,
        //     message: "you cant create ticket!",
        //     numbers: new_numbers,
        //     limit_data,
        //     block_data,
        //   })
        // );
        res.send(
         {
            success: true,
            message: "you cant create ticket!",
            numbers: new_numbers,
            limit_data,
            block_data,
          }
        );
        return;
      }
    } else {
      // res.send(
      //   encoding({
      //     success: false,
      //     message: `Haiti local time now: ${currentTime}. \n Time is up!. Sorry you cann't create ticket.`,
      //   })
      // );
      res.send(
        {
          success: false,
          message: `Haiti local time now: ${currentTime}. \n Time is up!. Sorry you cann't create ticket.`,
        }
      );
      return;
    }
  } catch (err) {
    console.log(err);
    // res.status(500).send(encoding({ message: err }));
    res.status(500).send({ message: err });
  }
};
// Read //tested
exports.getTicket = async (req, res) => {
  try {
    let { fromDate, toDate, lotteryCategoryName } = req.query;
   
    seller = mongoose.Types.ObjectId(req.userId);
    const query = { isDelete: false };
    if (fromDate && toDate) {
      query.date = { $gte: fromDate, $lte: toDate};
    }
    if (seller != "") {
      query.seller = seller;
    }
    if (lotteryCategoryName != "All Category") {
      query.lotteryCategoryName = lotteryCategoryName;
    }
    const ticketsObj = await Ticket.find(query, 
    //   {
    //   _id: 1,
    //   date: 1,
    //   ticketId: 1,
    //   lotteryCategoryName: 1,
    // }
    );
    res.send({ success: true, data: ticketsObj });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};
// Read  //tested
exports.getTicketNumbers = async (req, res) => {
  try {
    let { id } = req.query;
    const ticketsObj = await Ticket.findOne(
      { _id: mongoose.Types.ObjectId(id) },
      { numbers: 1 }
    );
    res.send({ success: true, data: ticketsObj.numbers });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};
//get Win Ticket
exports.matchWinningNumbers = async (req, res) => {
  try {
    const fromDate = req.query.fromDate;
    const toDate = req.query.toDate;
    const lotteryCategoryName = req.query.lotteryCategoryName;
    const seller = mongoose.Types.ObjectId(req.userId);

    const query = [];
    query.push({ $eq: ["$lotteryCategoryName", "$$lotteryCategoryName"] });
    query.push({ $eq: ["$date", "$$date"] });

    if (lotteryCategoryName != "All Category") {
      query.push({ $eq: ["$lotteryCategoryName", lotteryCategoryName] });
    }

    const subAdmin = await User.findOne({ _id: seller });

    Ticket.aggregate([
      {
        $match: {
          date: { $gte: new Date(fromDate), $lte: new Date(toDate) },
          seller: seller,
          isDelete: false,
        },
      },
      {
        $lookup: {
          from: "winningnumbers", // The collection name for WinningNumber model
          let: {
            lotteryCategoryName: "$lotteryCategoryName",
            date: "$date",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: query,
                },
              },
            },
          ],
          as: "winningNumbers",
        },
      },
      {
        $lookup: {
          from: "paymentterms",
          let: {
            lotteryCategoryName: "$lotteryCategoryName",
            subAdmin: "$subAdmin",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$lotteryCategoryName", "$$lotteryCategoryName"] },
                    { $eq: ["$subAdmin", subAdmin.subAdminId] },
                  ],
                },
              },
            },
          ],
          as: "paymentTerms",
        },
      },
      {
        $project: {
          seller: 1,
          ticketId: 1,
          date: 1,
          lotteryCategoryName: 1,
          numbers: 1,
          winningNumbers: 1,
          paymentTerms: 1,
        },
      },
      {
        $sort: {
          lotteryCategoryName: 1,
          ticketId: 1,
          date: 1,
        },
      },
    ]).exec((err, result) => {
      if (err) {
        console.log(err);
        res.send({ success: false, message: "not found!" });
      } else {
        const winTicket = [];
        // Process the result
        result.forEach((item) => {
          let numbers = item.numbers;
          if (item.winningNumbers.length == 0) return false;
          let winnumbers = item.winningNumbers[0].numbers;
          let payterms = item.paymentTerms[0].conditions;
          let paidAmount = 0;

          const winGameNumber = [];
          let winTicketFlag = false;

          numbers.forEach((gameNumber) => {
            let winNumberFlag = false;
            winnumbers.forEach((winNumber) => {
              if (
                gameNumber.number === winNumber.number &&
                gameNumber.gameCategory === winNumber.gameCategory
              ) {
                winNumberFlag = true;
                payterms.forEach((term) => {
                  if (
                    term.gameCategory === winNumber.gameCategory &&
                    winNumber.position === term.position
                  ) {
                    paidAmount += gameNumber.amount * term.condition;
                  }
                });
                return;
              }
            });

            if (winNumberFlag) {
              winGameNumber.push({ ...gameNumber, winFlag: true });
              winTicketFlag = true;
            } else {
              winGameNumber.push(gameNumber);
            }
          });

          if (winTicketFlag) {
            winTicket.push({
              ticketId: item.ticketId,
              date: item.date,
              lotteryCategoryName: item.lotteryCategoryName,
              seller: item.seller,
              numbers: winGameNumber,
              paidAmount: paidAmount,
            });
          }
        });
        res.send({ success: true, data: winTicket });
      }
    });
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
};
// Read //tested half ,the part when number equal to wining number not tested
exports.getSaleReportsForSeller = async (req, res) => {
  try {
    const fromDate = req.query.fromDate;
    const toDate = req.query.toDate;
    const lotteryCategoryName = req.query.lotteryCategoryName;
    const seller = mongoose.Types.ObjectId(req.userId);

    const query = [];
    query.push({ $eq: ["$lotteryCategoryName", "$$lotteryCategoryName"] });
    query.push({ $eq: ["$date", "$$date"] });

    const matchStage = {
      $match: {
        date: { $gte: new Date(fromDate), $lte: new Date(toDate) },
        seller: seller,
        isDelete: false,
      },
    };


    if (lotteryCategoryName != "All Category") {
      query.push({ $eq: ["$lotteryCategoryName", lotteryCategoryName] });
      matchStage.$match.lotteryCategoryName = lotteryCategoryName;
    }
  

    const seller_db_info = await User.findOne({ _id: seller });

    const result = await Ticket.aggregate([
      matchStage,
      {
        $lookup: {
          from: "paymentterms",
          let: {
            lotteryCategoryName: "$lotteryCategoryName",
            // subAdmin: "$subAdmin",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$lotteryCategoryName", "$$lotteryCategoryName"] },
                    { $eq: ["$subAdmin", seller_db_info.subAdminId] },
                  ],
                },
              },
            },
          ],
          as: "paymentTerms",
        },
      },
      {
        $lookup: {
          from: "winningnumbers",
          let: { lotteryCategoryName: "$lotteryCategoryName", date: "$date" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: query,
                },
              },
            },
          ],
          as: "winningNumbers",
        },
      },
      {
        $project: {
          ticketId: 1,
          date: 1,
          lotteryCategoryName: 1,
          numbers: 1,
          winningNumbers: 1,
          paymentTerms: 1,
        },
      },
    ]);
 
    let sumAmount = 0;
    let paidAmount = 0;

    result.forEach((item) => {
      const numbers = item.numbers;
  

      // sumAmount += numbers.reduce((total, value) => total + value.amount, 0);
      // console.log(sumAmount)
      if (item.winningNumbers.length !== 0 && item.paymentTerms.length !== 0) {

        const winnumbers = item.winningNumbers[0].numbers;
        const payterms = item.paymentTerms[0].conditions;
        // console.log("winnumbers",winnumbers)
        // console.log("payterm",payterms)
        numbers.forEach((gameNumber) => {
          
          winnumbers.forEach((winNumber) => {
          
            if (
              gameNumber.number === winNumber.number &&
              gameNumber.gameCategory === winNumber.gameCategory
            ) {
              // console.log("gamenumber", gameNumber)
              // console.log("winNumber",winNumber)
              payterms.forEach((term) => {
                if (
                  term.gameCategory === winNumber.gameCategory &&
                  winNumber.position === term.position
                ) {
                  paidAmount += gameNumber.amount * term.condition;
                }
              });
            }
          });
          // console.log("sum",sumAmount)

          if (!gameNumber.bonus) {
            sumAmount += gameNumber.amount;
          }
        });
      }
    });
    

    res.send({ success: true, data: { sum: sumAmount, paid: paidAmount } });
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
};
// Read   //tested half
exports.readWinningNumber = async (req, res) => {
  try {
    const { lotteryCategoryName, fromDate, toDate } = req.query;
    let winningNumber = null;
    if (lotteryCategoryName == "All Category") {
      winningNumber = await WinningNumber.find({
        date: { $gte: fromDate, $lte: toDate },
      }).sort({ date: 1 });
    } else {
      winningNumber = await WinningNumber.find({
        lotteryCategoryName: lotteryCategoryName,
        date: { $gte: fromDate, $lte: toDate },
      }).sort({ date: 1 });
    }

    if (winningNumber.length == 0) {
      return res.send({ success: false, message: "Winning number not found" });
    }
    //why this part 

    // const winNumber = [];
    // winningNumber.map((item) => {
    //   let numbers = {};
    //   item.numbers.map((value) => {
    //     if (value.gameCategory === "BLT" && value.position === 2) {
    //       numbers.second = value.number;
    //     }
    //     if (value.gameCategory === "BLT" && value.position === 3) {
    //       numbers.third = value.number;
    //     }
    //     if (value.gameCategory === "L3C") {
    //       numbers.l3c = value.number;
    //     }
    //   });

    //   winNumber.push({
    //     date: item.date,
    //     lotteryName: item.lotteryCategoryName,
    //     numbers: numbers,
    //   });
    // });

    res.send({ success: true, data: winningNumber});
  } catch (err) {
    console.log(err.message);
    res.send({ success: false, message: "Server error" });
  }
};

// tested
exports.lotteryTimeCheck = async (req, res) => {
  try {
    const lotId = req.query.lotId;
    const currentTime = moment().tz(haitiTimezone).format("HH:mm");
    const lotInfo = await Lottery.findOne({ _id: lotId });

    if (
      moment(currentTime, "HH:mm").isAfter(
        moment(lotInfo.startTime, "HH:mm")
      ) &&
      moment(currentTime, "HH:mm").isBefore(moment(lotInfo.endTime, "HH:mm"))
    ) {
      res.send({
        success: true,
        data: true,
        time: currentTime,
        startTime: lotInfo.startTime,
        endTime: lotInfo.endTime,
      });
      return;
    } else {
      res.send({
        success: true,
        data: false,
        time: currentTime,
        startTime: lotInfo.startTime,
        endTime: lotInfo.endTime,
      });
      return;
    }
  } catch (err) {
    console.log("time check error: ", err);
    res.send({ success: false, data: false });
  }
};

// Delete
exports.deleteTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(
      mongoose.Types.ObjectId(req.params.id)
    );
    if (ticket == null) {
      return res.status(404).send({ message: "Ticket not found" });
    }

    const lotInfo = await Lottery.findOne({
      lotteryName: ticket.lotteryCategoryName,
    });

    const currentTime = moment().tz(haitiTimezone).format("HH:mm");
    const today = moment().tz(haitiTimezone).format("yyyy-MM-DD");


    if (
      moment(new Date(today), "yyyy-MM-DD").isSame(
        moment(new Date(ticket.date), "YYY-MM-DD"),
        "day"
      ) &&
      moment(currentTime, "HH:mm").isAfter(
        moment(lotInfo.startTime, "HH:mm")
      ) &&
      moment(currentTime, "HH:mm").isBefore(moment(lotInfo.endTime, "HH:mm"))
    ) {
      const sellerId = ticket.seller;
      const subAdminInfo = await User.findOne({ _id: sellerId });
      const lotteryCategoryName = ticket.lotteryCategoryName;
      const numbers = ticket.numbers;
      await Promise.all(
        numbers.map(async (item) => {
          if (!item.bonus) {
            let limitGameCategory =item.gameCategory;

              // Pipelines for aggregation
            const hasSuperVisorId = !!subAdminInfo.superVisorId;

            // Build the $or array conditionally
            const orConditions = [
              // Include supervisor condition only if superVisorId exists
              ...(hasSuperVisorId
                ? [
                    {
                      superVisor: mongoose.Types.ObjectId(superVisorId),
                      "limits.gameCategory": limitGameCategory,
                    },
                  ]
                : []),
              {
                seller: mongoose.Types.ObjectId(sellerId),
                "limits.gameCategory": limitGameCategory,
              },
              {
                "limits.gameCategory": limitGameCategory,
              },
            ];
            
            // Build the pipeline
            const pipeline = [
              {
                $match: {
                  subAdmin: subAdminInfo.subAdminId._id,
                  lotteryCategoryName,
                  $or: orConditions,
                },
              },
              {
                $addFields: {
                  priority: {
                    $switch: {
                      branches: [
                        // Include supervisor priority only if superVisorId exists
                        ...(hasSuperVisorId
                          ? [
                              {
                                case: {
                                  $eq: ["$superVisor", mongoose.Types.ObjectId(superVisorId)],
                                },
                                then: 1, // Highest priority
                              },
                            ]
                          : []),
                        {
                          case: {
                            $eq: ["$seller", mongoose.Types.ObjectId(sellerId)],
                          },
                          then: hasSuperVisorId ? 2 : 1, // Adjust priority based on presence of superVisorId
                        },
                      ],
                      default: hasSuperVisorId ? 3 : 2, // Default priority
                    },
                  },
                  limits: {
                    $filter: {
                      input: "$limits",
                      cond: {
                        $eq: ["$$this.gameCategory", limitGameCategory],
                      },
                    },
                  },
                },
              },
              {
                $sort: {
                  priority: 1,
                },
              },
              {
                $limit: 1,
              },
              {
                $project: {
                  limits: 1,
                },
              },
            ];

          const limit = await Limits.aggregate(pipeline);

          await LimitCalc.findOneAndUpdate(
            {
              limitId: limit[0]._id,
              "soldState.gameCategory": limitGameCategory,
              "soldState.gameNumber": item.number,
            },
            {
              $inc: {
                "soldState.$.soldQuantity": -item.amount,
              },
            },
            { new: true }
          );
        }
      })
      );

      ticket.isDelete = true;
      await ticket.save();
      return res.send({ success: true, message: "Ticket deleted" });
    } else {
      return res.send({
        success: false,
        message: "Ticket time is up! You cann't remove this ticket!",
      });
    }
  } catch (err) {
    // console.log(err);
    res.status(500).send({ message: err.message });
  }
};

async function requestTicketCheck(lotteryCategoryName, sellerId, numbers,startTime) {
  try {
    
    // Get seller detail and populate subAdmin field
    const subAdminInfo = await User.findOne({ _id: sellerId }).populate("subAdminId");

    let superVisorId=subAdminInfo?.superVisorId ||""
    sellerId= mongoose.Types.ObjectId(sellerId)

    const blockNumberQuery = {
      subAdmin: subAdminInfo.subAdminId,
      lotteryCategoryName,
      $or: numbers.map((item) => ({
        gameCategory: item.gameCategory,
        number: item.number,
      })),
    };

    // Get data from BlockNumber that matches the query updated not tested yet
    const block_number = await BlockNumber.find(blockNumberQuery, {
      gameCategory: 1,
      number: 1,
      superVisor:1,
      seller:1

    });

    // console.log("block data" ,block_data)
    let block_data=[]

    const matchedNumbers = new Set();

    // Check for matches in block data
    for (const blockItem of block_number) {
     
      for (let i = numbers.length - 1; i >= 0; i--) {
        const item = numbers[i];
        //if it have sellerId and equal to userId
       
        if(blockItem?.seller && sellerId.equals(blockItem.seller) ){
         
          if (blockItem.gameCategory === item.gameCategory && blockItem.number === item.number) {
            block_data.push(blockItem)
            matchedNumbers.add(i);
          }
        }
        //  if it have supervisor and equal to user's supervisor
        if(superVisorId && blockItem?.superVisor && superVisorId.equals(blockItem.superVisor)){
          if (blockItem.gameCategory === item.gameCategory && blockItem.number === item.number) {
            block_data.push(blockItem)
            matchedNumbers.add(i);
          }
        }

        // data donot have supervisor and seller only admin 
        if(!blockItem?.superVisor && !blockItem.seller){
          if (blockItem.gameCategory === item.gameCategory && blockItem.number === item.number) {
            block_data.push(blockItem)
            matchedNumbers.add(i);
          }
        }
      }
    }


    const limit_data = [];
    const new_numbers = [];
    let acceptedAmountSum = 0;
    const currentDate = moment().tz(haitiTimezone).format("yyyy-MM-DD");
    const BltTicket=await Ticket.aggregate([
      {
        $match: {
          seller: sellerId,
          lotteryCategoryName: lotteryCategoryName,
          "numbers.gameCategory": "BLT",
          isDelete: false,
          date:new Date(currentDate)
        },
      },
      {
        $unwind: "$numbers",
      },
      {
        $project: {
          numbers: 1,
        },
      },
      {
        $match: {
          "numbers.gameCategory": "BLT",
        },
      },
      {
        $group:{
          _id:null,
          totalBLT:{$sum:"$numbers.amount"}
        }
      }
    ])

    const BLTAmount=BltTicket[0]?.totalBLT || 0;
  

    // soft testing upto here

    for (let index = 0; index < numbers.length; index++) {
      const item = numbers[index];
  
      if (!matchedNumbers.has(index)) {
        
        let limitGameCategory =item.gameCategory;

        // if you have other gameCategory the BLT check the percentage limit
        if(limitGameCategory!="BLT"){
          const ticket=await Ticket.aggregate([
            {
              $match: {
                seller: mongoose.Types.ObjectId(sellerId),
                lotteryCategoryName: lotteryCategoryName,
                "numbers.gameCategory": limitGameCategory,
                isDelete: false,
                date: new Date(currentDate)
              },
            },
            {
              $unwind: "$numbers",
            },
            {
              $project: {
                numbers: 1,
              },
            },
            {
              $match: {
                "numbers.gameCategory": limitGameCategory,
              },
            },
            {
              $group:{
                _id:null,
                total:{$sum:"$numbers.amount"}
              }
            }
          ])
          const gameCategoryAmount=ticket[0]?.total || 0


          //now here get the percentage amount from the model
          const LimitPercentArray = await LimitPercentage.aggregate([
            { 
              $match: { 
                subAdmin: subAdminInfo.subAdminId._id, 
                lotteryCategoryName: lotteryCategoryName 
              } 
            },
            { 
              $unwind: '$limits' 
            },
            { 
              $match: { 'limits.gameCategory':limitGameCategory } 
            },
            { 
              $project: { 
                _id: 0, 
                limitPercent: '$limits.limitPercent' 
              } 
            }
          ]);

          const gameLimitPercent = LimitPercentArray[0].limitPercent;


          // then check the BLTAmount ka percentage should be greater then the gameCategorryAmount+item.Amount 

          const maxGameLimit = (gameLimitPercent / 100) * BLTAmount;
         
          
          if(maxGameLimit < gameCategoryAmount+item.amount){
            return { success: false, error: `${limitGameCategory} is ${maxGameLimit} which is exceed bases on BLT amount` };
          }
        }


        // Pipelines for aggregation
        const hasSuperVisorId = !!subAdminInfo.superVisorId;

        // Build the $or array conditionally
        const orConditions = [
          // Include supervisor condition only if superVisorId exists
          ...(hasSuperVisorId
            ? [
                {
                  superVisor: mongoose.Types.ObjectId(superVisorId),
                  "limits.gameCategory": limitGameCategory,
                },
              ]
            : []),
          {
            seller: mongoose.Types.ObjectId(sellerId),
            "limits.gameCategory": limitGameCategory,
          },
          {
            "limits.gameCategory": limitGameCategory,
          },
        ];
        
        // Build the pipeline
        const pipeline1 = [
          {
            $match: {
              subAdmin: subAdminInfo.subAdminId._id,
              lotteryCategoryName,
              $or: orConditions,
            },
          },
          {
            $addFields: {
              priority: {
                $switch: {
                  branches: [
                    // Include supervisor priority only if superVisorId exists
                    ...(hasSuperVisorId
                      ? [
                          {
                            case: {
                              $eq: ["$superVisor", mongoose.Types.ObjectId(superVisorId)],
                            },
                            then: 1, // Highest priority
                          },
                        ]
                      : []),
                    {
                      case: {
                        $eq: ["$seller", mongoose.Types.ObjectId(sellerId)],
                      },
                      then: hasSuperVisorId ? 2 : 1, // Adjust priority based on presence of superVisorId
                    },
                  ],
                  default: hasSuperVisorId ? 3 : 2, // Default priority
                },
              },
              limits: {
                $filter: {
                  input: "$limits",
                  cond: {
                    $eq: ["$$this.gameCategory", limitGameCategory],
                  },
                },
              },
            },
          },
          {
            $sort: {
              priority: 1,
            },
          },
          {
            $limit: 1,
          },
          {
            $project: {
              limits: 1,
            },
          },
        ];
        // If sellerId is provided, the pipeline will only return documents that have a seller
        //  matching that ID and contain the specified gameCategory. If no sellerId is provided, 
        //  it will still match documents that have the specified gameCategory but without considering the seller field.

          let limit = await Limits.aggregate(pipeline1);

          // getting correct limit if we have seller and admin limit 
          // check for if superVisor limit 




          


        if (limit.length > 0) {
          let limitCalc = await LimitCalc.findOne(
            {
              limitId: limit[0]._id,
              "soldState.gameCategory": limitGameCategory,
              "soldState.gameNumber": item.number,
              date: new Date(currentDate)
            },
            {
              "soldState.$": 1,
            }
          );
        

          

          let restQuantity = null;
          let addAmount = null;

          // Check for quantities of both "32x54" and "54x32"
          const alternateNumber = item.number.split("x").reverse().join("x");

          const totalSoldQuantity = await LimitCalc.aggregate([
            {
              $match: {
                limitId: limit[0]._id,
                date: new Date(currentDate)
              },
            },
            {
              $unwind: "$soldState",
            },
            {
              $match: {
                $or: [
                  {
                    "soldState.gameCategory": limitGameCategory,
                    "soldState.gameNumber": item.number,
                  },
                  {
                    "soldState.gameCategory": limitGameCategory,
                    "soldState.gameNumber": alternateNumber,
                  },
                ],
              },
            },
            {
              $group: {
                _id: null,
                totalSold: { $sum: "$soldState.soldQuantity" },
              },
            },
          ]);

          const totalSold = totalSoldQuantity.length > 0 ? totalSoldQuantity[0].totalSold : 0;


          
          
          // let you want to input 10x20 and its your frist time to buy item
          // but you have buy the 20x10 then 10x20 (limitcalc=undefined) then if condition not run
          // but it have totalSold then it have to run
          if (limitCalc) {
            restQuantity = limit[0].limits[0]?.limitsButs - totalSold;
           
            

            if (item.amount > restQuantity) {
              limit_data.push({ ...item, availableAmount: restQuantity });
              addAmount = restQuantity;
            } else {
              addAmount = item.amount;
            }


            if (addAmount > 0) {
              await LimitCalc.findOneAndUpdate(
                {
                  limitId: limit[0]._id,
                  "soldState.gameCategory": limitGameCategory,
                  "soldState.gameNumber": item.number,
                },
                {
                  $inc: {
                    "soldState.$.soldQuantity": addAmount,
                  },
                },
                { new: true }
              );
            }
          } else {  //if 10x20 doesnot exist but 20x10 exist then substract the limit to totalSold quantity
            //this part not understand yet to have to work more
            if (item.amount > (limit[0].limits[0]?.limitsButs-totalSold)) {
              limit_data.push({
                ...item,
                availableAmount: limit[0].limits[0]?.limitsButs-totalSold,
              });

              addAmount = limit[0].limits[0]?.limitsButs-totalSold;
            } else {
              addAmount = item.amount;
            }

            limitCalc = await LimitCalc.findOne({ limitId: limit[0]._id , date: new Date(currentDate)});

            if (limitCalc) {
              limitCalc.soldState.push({
                gameCategory: limitGameCategory,
                gameNumber: item.number,
                soldQuantity: addAmount,
              });

             
              await limitCalc.save();
            } else {
              const newLimitCalc = new LimitCalc({
                limitId: limit[0]._id,
                date: new Date(currentDate),
                soldState: [
                  {
                    gameCategory: limitGameCategory,
                    gameNumber: item.number,
                    soldQuantity: addAmount,
                  },
                ],
              });

              await newLimitCalc.save();


            }
          }

          if (addAmount > 0) {
            new_numbers.push({ ...item, amount: addAmount, bonus: false });
          }
        } else {
          new_numbers.push({ ...item, bonus: false });
        }

        acceptedAmountSum += item.amount;
      }

    }

    // It is working fine for BLT  Not tested percentage Limit Part

    if (subAdminInfo.subAdminId.bonusFlag && new_numbers.length > 0) {
      if (acceptedAmountSum >= 50 && acceptedAmountSum < 250) {
        const bonus_1 =
          Math.floor(Math.random() * 99)
            .toString()
            .padStart(2, "0") +
          "×" +
          Math.floor(Math.random() * 99)
            .toString()
            .padStart(2, "0");
        const bonus_2 =
          Math.floor(Math.random() * 99)
            .toString()
            .padStart(2, "0") +
          "×" +
          Math.floor(Math.random() * 99)
            .toString()
            .padStart(2, "0");
        new_numbers.push({
          gameCategory: "MRG",
          number: bonus_1,
          amount: 1,
          bonus: true,
        });
        new_numbers.push({
          gameCategory: "MRG",
          number: bonus_2,
          amount: 1,
          bonus: true,
        });
      } else if (acceptedAmountSum >= 250 && acceptedAmountSum < 1000) {
        const bonus_1 =
          Math.floor(Math.random() * 99)
            .toString()
            .padStart(2, "0") +
          "×" +
          Math.floor(Math.random() * 99)
            .toString()
            .padStart(2, "0");
        const bonus_2 =
          Math.floor(Math.random() * 99)
            .toString()
            .padStart(2, "0") +
          "×" +
          Math.floor(Math.random() * 99)
            .toString()
            .padStart(2, "0");
        const bonus_3 =
          Math.floor(Math.random() * 99)
            .toString()
            .padStart(2, "0") +
          "×" +
          Math.floor(Math.random() * 99)
            .toString()
            .padStart(2, "0");
        const bonus_4 =
          Math.floor(Math.random() * 99)
            .toString()
            .padStart(2, "0") +
          "×" +
          Math.floor(Math.random() * 99)
            .toString()
            .padStart(2, "0");
        new_numbers.push({
          gameCategory: "MRG",
          number: bonus_1,
          amount: 1,
          bonus: true,
        });
        new_numbers.push({
          gameCategory: "MRG",
          number: bonus_2,
          amount: 1,
          bonus: true,
        });
        new_numbers.push({
          gameCategory: "MRG",
          number: bonus_3,
          amount: 1,
          bonus: true,
        });
        new_numbers.push({
          gameCategory: "MRG",
          number: bonus_4,
          amount: 1,
          bonus: true,
        });
      } else if (acceptedAmountSum >= 1000) {
        const bonus_1 =
          Math.floor(Math.random() * 99)
            .toString()
            .padStart(2, "0") +
          "×" +
          Math.floor(Math.random() * 99)
            .toString()
            .padStart(2, "0");
        const bonus_2 =
          Math.floor(Math.random() * 99)
            .toString()
            .padStart(2, "0") +
          "×" +
          Math.floor(Math.random() * 99)
            .toString()
            .padStart(2, "0");
        const bonus_3 =
          Math.floor(Math.random() * 99)
            .toString()
            .padStart(2, "0") +
          "×" +
          Math.floor(Math.random() * 99)
            .toString()
            .padStart(2, "0");
        const bonus_4 =
          Math.floor(Math.random() * 99)
            .toString()
            .padStart(2, "0") +
          "×" +
          Math.floor(Math.random() * 99)
            .toString()
            .padStart(2, "0");
        const bonus_5 =
          Math.floor(Math.random() * 99)
            .toString()
            .padStart(2, "0") +
          "×" +
          Math.floor(Math.random() * 99)
            .toString()
            .padStart(2, "0");
        new_numbers.push({
          gameCategory: "MRG",
          number: bonus_1,
          amount: 1,
          bonus: true,
        });
        new_numbers.push({
          gameCategory: "MRG",
          number: bonus_2,
          amount: 1,
          bonus: true,
        });
        new_numbers.push({
          gameCategory: "MRG",
          number: bonus_3,
          amount: 1,
          bonus: true,
        });
        new_numbers.push({
          gameCategory: "MRG",
          number: bonus_4,
          amount: 1,
          bonus: true,
        });
        new_numbers.push({
          gameCategory: "MRG",
          number: bonus_5,
          amount: 1,
          bonus: true,
        });
      }
    }

    return { success: true, block_data, limit_data, new_numbers };
  } catch (error) {
    console.log("ticket check error: ", error);
    return { success: false, error: error };
  }
}

// Read
exports.getDeletedTicket = async (req, res) => {
  try {
    let { fromDate, toDate, lotteryCategoryName } = req.query;
    seller = mongoose.Types.ObjectId(req.userId);
    const query = { isDelete: true };
    if (fromDate && toDate) {
      query.date = { $gte: fromDate, $lte: toDate };
    }
    if (seller != "") {
      query.seller = seller;
    }
    if (lotteryCategoryName != "All Category") {
      query.lotteryCategoryName = lotteryCategoryName;
    }
    const ticketsObj = await Ticket.find(query, {
      _id: 1,
      date: 1,
      ticketId: 1,
      lotteryCategoryName: 1,
    });
    res.send({ success: true, data: ticketsObj });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// Delete
exports.deleteTicketForever = async (req, res) => {
  try {
    await Ticket.deleteOne({ _id: mongoose.Types.ObjectId(req.params.id) });
    return res.send({ success: true, message: "Ticket deleted" });
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: err.message });
  }
};

// Ticket Replay
exports.replayTicket = async (req, res) => {
  try {
    const { tId, date, lottery, newLottery } = req.body;

    // lottery time check
    const currentTime = moment().tz(haitiTimezone).format("HH:mm");
    const lotInfo = await Lottery.findOne({ lotteryName: newLottery });
    if (
      moment(currentTime, "HH:mm").isAfter(
        moment(lotInfo.startTime, "HH:mm")
      ) &&
      moment(currentTime, "HH:mm").isBefore(moment(lotInfo.endTime, "HH:mm"))
    ) {
      const match = await Ticket.findOne(
        {
          date: date,
          ticketId: tId,
          lotteryCategoryName: lottery,
          seller: req.userId,
        },
        { numbers: 1 }
      );

      if (match) {
        res.send(
          encoding({
            success: true,
            numbers: match.numbers,
          })
        );
      } else {
        res.send(
          encoding({
            success: false,
            message: "Not Found Data!",
          })
        );
      }
    } else {
      res.send(
        encoding({
          success: false,
          message: "Lottery time check failed!",
        })
      );
      return;
    }
  } catch {
    res.send({ success: false, data: false });
  }
};

// This is check blocked seller. like this middleware.
exports.isActive = (req, res, next) => {
  User.findById(req.userId).exec((err, user) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    }
    if (user && user.isActive === true) {
      next();
      return;
    }

    res.send(encoding({ success: false, message: "Unauthorized!" }));
    return;
  });
};

function encoding(data) {
  return browserify_zlib.gzipSync(JSON.stringify(data));
}
