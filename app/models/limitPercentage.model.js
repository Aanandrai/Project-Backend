const mongoose = require("mongoose");
const LotteryCategory = require("./lotteryCategory.model");
// This limits will Apply on gameCategory (Doubt in it as why seller is this part)
// seller can only sell upto limitButs of gameCategory
//  LotteryCategory->AdminId->


// Define the Limits schema
const limitsSchema = new mongoose.Schema(
  {
    // The subAdmin who limit the number
    subAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required:true
    },
    // The name of the LotteryCategory associated with these limits
    lotteryCategoryName: {
      type: String,
      required: true,
    },
    limits: {
      type: [
        {
          // The name of the game category associated with these limits
          gameCategory: {
            type: String,
          },
          // The limits for this game category
          limitPercent: {
            type: Number
          }
        }
      ]
    },
  },
  // Add timestamps to the schema
  {
    timestamps: true,
  }
);

// Create the Limits model
const LimitPercentage = mongoose.model("LimitPercentage", limitsSchema);

// Export the Limits model
module.exports = LimitPercentage;