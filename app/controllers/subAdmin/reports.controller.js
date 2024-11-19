const mongoose = require("mongoose");
const db = require("../../models");
const LotteryCategory = require("../../models/lotteryCategory.model");
const Ticket = db.ticket;
const User = db.user;
const Limit = db.limits;

exports.getSaleReports = async (req, res) => {
  try {
    const fromDate = req.query.fromDate;
    const toDate = req.query.toDate;
    const lotteryCategoryName = req.query.lotteryCategoryName;
    const seller = req.query.seller;
    const subAdminId = mongoose.Types.ObjectId(req.userId);

    const query = [];
    query.push({ $eq: ["$lotteryCategoryName", "$$lotteryCategoryName"] });
    query.push({ $eq: ["$date", "$$date"] });

    let seller_query = null;

    let sellerIds = [];
    if (seller == "") {
      const sellers = await User.find({ subAdminId: subAdminId }, { _id: 1 });
      sellerIds = sellers.map((item) => item._id);
      seller_query = { $in: sellerIds };
    } else {
      seller_query = mongoose.Types.ObjectId(seller);
    }


    const matchStage = {
      $match: {
        date: { $gte: new Date(fromDate), $lte: new Date(toDate) },
        seller: seller_query,
        isDelete: false,
      },
    };

    if (lotteryCategoryName !== "") {
      query.push({ $eq: ["$lotteryCategoryName", lotteryCategoryName] });
      matchStage.$match.lotteryCategoryName = lotteryCategoryName;
    }

    const result = await Ticket.aggregate([
      matchStage,
      {
        $lookup: {
          from: "users",
          localField: "seller",
          foreignField: "_id",
          as: "sellerInfo",
        },
      },
      {
        $unwind: "$sellerInfo",
      },
      {
        $lookup: {
          from: "paymentterms",
          let: {
            lotteryCategoryName: "$lotteryCategoryName",
            seller: "$seller",
            superVisor: "$sellerInfo.superVisorId",
            subAdmin: "$subAdmin",
            date: "$date",
          },
          pipeline: [
            {
              $facet: {
                priority1: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$subAdmin", subAdminId] },
                          { $eq: ["$lotteryCategoryName", "$$lotteryCategoryName"] },
                          { $eq: ["$seller", "$$seller"] },
                          { $eq: ["$date", "$$date"] },
                        ],
                      },
                    },
                  },
                ],
                priority2: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$subAdmin", subAdminId] },
                          { $eq: ["$seller", "$$seller"] },
                          { $eq: ["$date", "$$date"] },
                          { $not: { $ifNull: ["$lotteryCategoryName", false] }  },
                        ],
                      },
                    },
                  },
                ],
                priority3: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$subAdmin", subAdminId] },
                          { $eq: ["$lotteryCategoryName", "$$lotteryCategoryName"] },
                          { $eq: ["$superVisor", "$$superVisor"] },
                          { $eq: ["$date", "$$date"] },
                        ],
                      },
                    },
                  },
                ],
                priority4: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$subAdmin", subAdminId] },
                          { $eq: ["$superVisor", "$$superVisor"] },
                          { $eq: ["$date", "$$date"] },
                          { $not: { $ifNull: ["$lotteryCategoryName", false] }  },
                        ],
                      },
                    },
                  },
                ],
                priority5: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$subAdmin", subAdminId] },
                          { $eq: ["$lotteryCategoryName", "$$lotteryCategoryName"] },
                          { $not: {$ifNull:["$seller", false] }},
                          { $not: {$ifNull:["$superVisor", false]} },
                          { $eq: ["$date", "$$date"] },
                        ],
                      },
                    },
                  },
                ],
                priority6: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$subAdmin",subAdminId ] },
                          { $eq: ["$date", "$$date"] },
                          { $not: {$ifNull:["$seller", false] }},
                          { $not: {$ifNull:["$superVisor", false]} },
                          { $not: { $ifNull: ["$lotteryCategoryName", false] }  },
                        ],
                      },
                    },
                  },
                ],
              },
            },
            {
              $project: {
                // Get the first non-null and non-undefined payment term
                paymentTerms: {
                  $let: {
                    vars: {
                      priorities: [
                        { $arrayElemAt: ["$priority1", 0] },
                        { $arrayElemAt: ["$priority2", 0] },
                        { $arrayElemAt: ["$priority3", 0] },
                        { $arrayElemAt: ["$priority4", 0] },
                        { $arrayElemAt: ["$priority5", 0] },
                        { $arrayElemAt: ["$priority6", 0] }
                      ]
                    },
                    in: {
                      $first: {
                        $filter: {
                          input: "$$priorities",
                          as: "priority",
                          cond: { $ne: ["$$priority", null] }  // Only pick non-null priorities
                        }
                      }
                    }
                  }
                }
              }
            }
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
          seller: "$sellerInfo.userName",
          supervisor: "$sellerInfo.supervisor",
          ticketId: 1,
          date: 1,
          lotteryCategoryName: 1,
          numbers: 1,
          winningNumbers: 1,
          paymentTerms: { $arrayElemAt: ["$paymentTerms", 0] },
        },
      },
    ]);

    const resultBySeller = {};

    if(result.length==0){
      res.send({ success: true, data: resultBySeller });
      return
    }

    result?.forEach((item) => {
      
      const sellerName = item.seller;
      const numbers = item?.numbers;

      let sumAmount = 0;
      let paidAmount = 0;

      sumAmount += numbers.reduce((total, value) => total + value.amount, 0);

      if (Array.isArray(item?.winningNumbers) &&
        item?.winningNumbers?.length !== 0 && 
        Array.isArray(item?.paymentTerms?.paymentTerms?.conditions) &&
        item?.paymentTerms?.paymentTerms?.conditions?.length !== 0) {

        const winnumbers = item.winningNumbers[0]?.numbers;
        const payterms = item.paymentTerms?.paymentTerms?.conditions;

        if (Array.isArray(numbers) && numbers.length > 0 && Array.isArray(payterms)  && payterms.length > 0) {
          numbers.forEach((gameNumber) => {
            winnumbers.forEach((winNumber) => {
              if (
                gameNumber.number === winNumber.number &&
                gameNumber.gameCategory === winNumber.gameCategory
              ) {
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
            
          });
        }

      }

      // numbers.forEach((gameNumber) => {
      //   if (!gameNumber.bonus) {
      //     sumAmount += gameNumber.amount;
      //   }
      // });

      if (!resultBySeller[sellerName]) {
        resultBySeller[sellerName] = {
          name: sellerName,
          sum: sumAmount,
          paid: paidAmount,
        };
      } else {
        resultBySeller[sellerName].sum += sumAmount;
        resultBySeller[sellerName].paid += paidAmount;
      }
    });

    res.send({ success: true, data: resultBySeller });
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
};

// get sell details
exports.getSellDetails = async (req, res) => {
  try {
    const { fromDate, lotteryCategoryName, seller } = req.query;
    const subAdminId = mongoose.Types.ObjectId(req.userId);

    let seller_query = null;
    const sellerIds = [];

    const query = { isDelete: false };
    query.date = new Date(fromDate);

    if (lotteryCategoryName != "") {
      query.lotteryCategoryName = lotteryCategoryName;
    }

    if (seller == "") {
      const sellers = await User.find({ subAdminId: subAdminId }, { _id: 1 });
      sellers.map((item) => {
        sellerIds.push(item._id);
      });
      seller_query = { $in: sellerIds };
    } else {
      seller_query = mongoose.Types.ObjectId(seller);
    }

    query.seller = seller_query;

    Ticket.aggregate([
      {
        $match: query,
      },
      {
        $unwind: "$numbers",
      },
      {
        $group: {
          _id: {
            lotteryCategoryName: lotteryCategoryName,
            date: new Date(fromDate),
            gameCategory: "$numbers.gameCategory",
            number: "$numbers.number",
            bonus: {
              $cond: {
                if: { $eq: ["$numbers.bonus", false] }, // Condition to check if bonus is false
                then: "false",
                else: "true",
              },
            },
          },
          count: { $sum: 1 },
          totalAmount: { $sum: "$numbers.amount" },
        },
      },
      {
        $match: {
          "_id.bonus": "false", // Filter groups where bonus is false
        },
      },
      {
        $sort: {
          totalAmount: -1,
        },
      },
    ])
      .then((result) => {
        res.send({ success: true, data: result });
      })
      .catch((error) => {
        console.error(error);
        res.send({ success: false, error: error });
      });
  } catch (err) {
    console.error(err);
    res.state(500).send(err);
  }
};

// get sell details by gameCategory
exports.getSellDetailsByGameCategory = async (req, res) => {
  try {
    const { fromDate, lotteryCategoryName, seller } = req.query;
    const subAdminId = mongoose.Types.ObjectId(req.userId);

    let seller_query = null;
    const sellerIds = [];

    const query = { isDelete: false };
    query.date = new Date(fromDate);

    if (lotteryCategoryName != "") {
      query.lotteryCategoryName = lotteryCategoryName;
    }

    if (seller == "") {
      const sellers = await User.find({ subAdminId: subAdminId }, { _id: 1 });
      sellers.map((item) => {
        sellerIds.push(item._id);
      });
      seller_query = { $in: sellerIds };
    } else {
      seller_query = mongoose.Types.ObjectId(seller);
    }

    query.seller = seller_query;

    Ticket.aggregate([
      {
        $match: query,
      },
      {
        $unwind: "$numbers",
      },
      {
        $group: {
          _id: {
            lotteryCategoryName: lotteryCategoryName,
            gameCategory: "$numbers.gameCategory",
            bonus: {
              $cond: {
                if: { $eq: ["$numbers.bonus", false] }, // Condition to check if bonus is false
                then: "false",
                else: "true",
              },
            },
          },
          totalAmount: { $sum: "$numbers.amount" },
        },
      },
      {
        $match: {
          "_id.bonus": "false", // Filter groups where bonus is false
        },
      },
      {
        $sort: {
          totalAmount: -1,
        },
      },
    ])
      .then((result) => {
        res.send({ success: true, data: result });
      })
      .catch((error) => {
        console.error(error);
        res.send({ success: false, error: error });
      });
  } catch (err) {
    console.error(err);
    res.state(500).send(err);
  }
};

//get sell details all lotteryCategory       have to make changes as we have change payment terms
exports.getSellDetailsByAllLoteryCategory = async (req, res) => {
  try {
    const fromDate = req.query.fromDate;
    const seller = req.query.seller;
    const subAdminId = mongoose.Types.ObjectId(req.userId);

    const query = [];
    query.push({ $eq: ["$lotteryCategoryName", "$$lotteryCategoryName"] });
    query.push({ $eq: ["$date", "$$date"] });

    let seller_query = null;
    let sellerIds = [];
    if (seller == "") {
      const sellers = await User.find({ subAdminId: subAdminId }, { _id: 1 });
      sellerIds = sellers.map((item) => item._id);
      seller_query = { $in: sellerIds };
    } else {
      seller_query = mongoose.Types.ObjectId(seller);
    }

    const matchStage = {
      $match: {
        date: { $eq: new Date(fromDate) },
        seller: seller_query,
        isDelete: false,
      },
    };

    const result = await Ticket.aggregate([
      matchStage,
      {
        $lookup: {
          from: "users",
          localField: "seller",
          foreignField: "_id",
          as: "sellerInfo",
        },
      },
      {
        $unwind: "$sellerInfo",
      },
      {
        $lookup: {
          from: "paymentterms",
          let: {
            lotteryCategoryName: "$lotteryCategoryName",
            seller: "$seller",
            superVisor: "$sellerInfo.superVisorId",
            subAdmin: "$subAdmin",
            date: "$date",
          },
          pipeline: [
            {
              $facet: {
                priority1: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$subAdmin", subAdminId] },
                          { $eq: ["$lotteryCategoryName", "$$lotteryCategoryName"] },
                          { $eq: ["$seller", "$$seller"] },
                          { $eq: ["$date", "$$date"] },
                        ],
                      },
                    },
                  },
                ],
                priority2: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$subAdmin", subAdminId] },
                          { $eq: ["$seller", "$$seller"] },
                          { $eq: ["$date", "$$date"] },
                          { $not: { $ifNull: ["$lotteryCategoryName", false] }  },
                        ],
                      },
                    },
                  },
                ],
                priority3: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$subAdmin", subAdminId] },
                          { $eq: ["$lotteryCategoryName", "$$lotteryCategoryName"] },
                          { $eq: ["$superVisor", "$$superVisor"] },
                          { $eq: ["$date", "$$date"] },
                        ],
                      },
                    },
                  },
                ],
                priority4: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$subAdmin", subAdminId] },
                          { $eq: ["$superVisor", "$$superVisor"] },
                          { $eq: ["$date", "$$date"] },
                          { $not: { $ifNull: ["$lotteryCategoryName", false] }  },
                        ],
                      },
                    },
                  },
                ],
                priority5: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$subAdmin", subAdminId] },
                          { $eq: ["$lotteryCategoryName", "$$lotteryCategoryName"] },
                          { $not: {$ifNull:["$seller", false] }},
                          { $not: {$ifNull:["$superVisor", false]} },
                          { $eq: ["$date", "$$date"] },
                        ],
                      },
                    },
                  },
                ],
                priority6: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$subAdmin",subAdminId ] },
                          { $eq: ["$date", "$$date"] },
                          { $not: {$ifNull:["$seller", false] }},
                          { $not: {$ifNull:["$superVisor", false]} },
                          { $not: { $ifNull: ["$lotteryCategoryName", false] }  },
                        ],
                      },
                    },
                  },
                ],
              },
            },
            {
              $project: {
                // Get the first non-null and non-undefined payment term
                paymentTerms: {
                  $let: {
                    vars: {
                      priorities: [
                        { $arrayElemAt: ["$priority1", 0] },
                        { $arrayElemAt: ["$priority2", 0] },
                        { $arrayElemAt: ["$priority3", 0] },
                        { $arrayElemAt: ["$priority4", 0] },
                        { $arrayElemAt: ["$priority5", 0] },
                        { $arrayElemAt: ["$priority6", 0] }
                      ]
                    },
                    in: {
                      $first: {
                        $filter: {
                          input: "$$priorities",
                          as: "priority",
                          cond: { $ne: ["$$priority", null] }  // Only pick non-null priorities
                        }
                      }
                    }
                  }
                }
              }
            }
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
          paymentTerms: { $arrayElemAt: ["$paymentTerms", 0] },
        },
      },
    ]);

   
    const resultBySeller = {};

    result.forEach((item) => {
      const lotteryName = item.lotteryCategoryName;
      const numbers = item.numbers;

      let sumAmount = 0;
      let paidAmount = 0;

      sumAmount += numbers.reduce((total, value) => total + value.amount, 0);
      if (Array.isArray(item?.winningNumbers) &&
        item?.winningNumbers?.length !== 0 && 
        Array.isArray(item?.paymentTerms?.paymentTerms?.conditions) &&
        item?.paymentTerms?.paymentTerms?.conditions?.length !== 0) {


        const winnumbers = item.winningNumbers[0].numbers;
        const payterms = item.paymentTerms?.paymentTerms?.conditions;
        numbers.forEach((gameNumber) => {
          winnumbers.forEach((winNumber) => {
            if (
              gameNumber.number === winNumber.number &&
              gameNumber.gameCategory === winNumber.gameCategory
            ) {
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

          // if (!gameNumber.bonus) {
          //   sumAmount += gameNumber.amount;
          // }
        });
      }

      if (!resultBySeller[lotteryName]) {
        resultBySeller[lotteryName] = {
          name: lotteryName,
          sum: sumAmount,
          paid: paidAmount,
        };
      } else {
        resultBySeller[lotteryName].sum += sumAmount;
        resultBySeller[lotteryName].paid += paidAmount;
      }
    });

    res.send({ success: true, data: resultBySeller });
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
};

//get detail gameNumber sell info
exports.getSellGameNumberInfo = async (req, res) => {
  try {
    const { lotteryCategoryName, gameCategory, gameNumber, fromDate, seller } =
      req.query;
      // console.log(fromDate)
      // console.log(seller)
      // console.log(lotteryCategoryName)
      // console.log(gameCategory)
      // console.log(gameNumber)
    const subAdminId = mongoose.Types.ObjectId(req.userId);
    let seller_query = null;
    let sellerIds = [];
    let limitInfo = null;

    let limitGameCategory = gameCategory

    // if (
    //   gameCategory == "L4C 1" ||
    //   gameCategory == "L4C 2" ||
    //   gameCategory == "L4C 3"
    // ) {
    //   limitGameCategory = "L4C";
    // } else if (
    //   gameCategory == "L5C 1" ||
    //   gameCategory == "L5C 2" ||
    //   gameCategory == "L5C 3"
    // ) {
    //   limitGameCategory = "L5C";
    // } else {
    //   limitGameCategory = gameCategory;
    // }
    
    if (seller == "") {
      const sellers = await User.find({ subAdminId: subAdminId }, { _id: 1 });
      sellerIds = sellers.map((item) => item._id);
      seller_query = { $in: sellerIds };
    } else {
      seller_query = mongoose.Types.ObjectId(seller);

      const superVisor = await User.findOne({ _id: seller_query },{"superVisorId.$":1})
      const superVisorId = superVisor?.superVisorId
      // console.log(superVisorId)

      // if superVisor exist mean no seller limit possible there so apply superVisor limit
      if(superVisorId){
        // superViosrId and lotteryCategoryName
        limitInfo=await Limit.findOne({
          lotteryCategoryName,
          subAdmin: subAdminId,
          superVisor:superVisorId,
          seller:{ $exists: false },
          "limits.gameCategory": limitGameCategory
        },{ "limits.$": 1 })

      }else{
        // if no superViosr exist then apply seller limit

        // sellerId and lotteryCategoryName
        limitInfo = await Limit.findOne(
          {
            lotteryCategoryName,
            seller: seller_query,
            subAdmin: subAdminId,
            "limits.gameCategory": limitGameCategory,
            superVisor:{ $exists: false}
          },
          { "limits.$": 1 }
        )
      }

    }

    // if until now limitInfo not found then apply subAdmin limit means 
    // you call for all seller 
    // or seller you select does not have superVisor limit if superVisor exist else seller limit not exist
    
    if (limitInfo == null) {
      // subAdminId and LotteryCategoryName
      limitInfo = await Limit.findOne(
        {
          lotteryCategoryName,
          subAdmin: subAdminId,
          "limits.gameCategory": limitGameCategory,
          superVisor:{ $exists: false },
          seller:{ $exists: false }
        },
        { "limits.$": 1 }
      );
    }

    const matchData = await Ticket.find({
      seller: seller_query,
      date: new Date(fromDate),
      isDelete: false,
      lotteryCategoryName: lotteryCategoryName,
      "numbers.gameCategory": gameCategory,
      "numbers.number": gameNumber,
      "numbers.bonus": false,
    });

    const result = {};

    if (matchData.length !== 0) {
      for (const item of matchData) {
        let sum = 0;
        for (const number of item.numbers) {
          if (
            number.number === gameNumber &&
            number.gameCategory === gameCategory
          ) {
            sum += number.amount;
          }
        }

        const sellerName = await User.findOne(
          { _id: item.seller },
          { userName: 1 }
        );
        const companyName = await User.findOne(
          { _id: subAdminId },
          { companyName: 1 }
        );

        if (!result[item.seller]) {
          result[item.seller] = {
            sum: sum,
            name: sellerName.userName,
            company: companyName.companyName,
            ticketCount: 1,
          };
        } else {
          result[item.seller].sum += sum;
          result[item.seller].ticketCount += 1;
        }
      }
    }

    res.send({
      success: true,
      data: result,
      limitInfo: limitInfo?.limits[0].limitsButs,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send(err);
  }
};
