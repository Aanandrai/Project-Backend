const mongoose = require("mongoose");
// this limit on number so that they cannot put all on one number(probably ++)
// it include all the soldQuantity of number 
// Define the Limits schema
const limitsCalcSchema = new mongoose.Schema(
  {
    // The subAdmin who limit the number
    limitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Limits",
    },
    date: {
      type: Date,
      // required: true
    },
    soldState: {
      type: [
        {
          // The name of the game category associated with these limits
          gameCategory: {
            type: String,
          },
          gameNumber: {
            type: String,
            default: "",
          },
          // The sold quantity
          soldQuantity: {
            type: Number,
            default: 0,
          },
        },
      ],
    },
  },
  // Add timestamps to the schema
  {
    timestamps: true,
  }
);

// Create the Limits model
const LimitsCalc = mongoose.model("LimitsCalc", limitsCalcSchema);

// Export the Limits model
module.exports = LimitsCalc;
