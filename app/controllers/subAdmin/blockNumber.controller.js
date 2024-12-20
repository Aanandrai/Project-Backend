const db = require("../../models");
const BlockNumber = db.blockNumber;

// Create //update the block Number for seller ,supervisor and Subadmin
exports.addBlockNumber = async (req, res) => {
 
  const { lotteryCategoryName, gameCategory, number, superVisorId, sellerId } = req.body;
  const subAdmin = req.userId;

  // Prepare the data for the BlockNumber document
  const blockNumberData = {
    subAdmin,
    gameCategory,
    number,
  };

  // Add supervisor and seller IDs only if they are provided
  if (superVisorId) {
    blockNumberData.superVisor = superVisorId;
  }
  else if(sellerId) {
    blockNumberData.seller = sellerId;
  }

  if(lotteryCategoryName){
    blockNumberData.lotteryCategoryName=lotteryCategoryName
  }

  try {
    const blockNumber = new BlockNumber(blockNumberData);
    await blockNumber.save();

    res.status(201).json(blockNumber);
  } catch (err) {
    // console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Read
exports.getBlockNumberAll = async (req, res) => {

  try {
    const blockNumbers = await BlockNumber.find({ subAdmin: req.userId });

    if (blockNumbers.length === 0) {
      return res.status(404).json({ message: 'Block numbers not found for subAdmin' });
    }

    res.json(blockNumbers);
  } catch (err) {
    // console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Update
exports.updateBlockNumber = async (req, res) => {
  const { id } = req.params;
  const { lotteryCategoryName, gameCategory, number ,sellerId ,superVisorId } = req.body;

  try {
    let blockNumber = await BlockNumber.findById(id);

    if (!blockNumber) {
      return res.status(404).json({ message: 'Block number not found' });
    }

    blockNumber.lotteryCategoryName = lotteryCategoryName;
    blockNumber.gameCategory = gameCategory;
    blockNumber.number = number;
    blockNumber.seller=sellerId,
    blockNumber.superVisor=superVisorId


    blockNumber = await blockNumber.save();

    res.json(blockNumber);
  } catch (err) {
    // console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// DELETE a block number by ID
exports.deleteBlockNumber = async (req, res) => {
  const { id } = req.params;

  try {
    const blockNumber = await BlockNumber.findById(id);

    if (!blockNumber) {
      return res.status(404).json({ message: 'Block number not found' });
    }

    await blockNumber.remove();

    res.json({ message: 'Block number removed' });
  } catch (err) {
    // console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};