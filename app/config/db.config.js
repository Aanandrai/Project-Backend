const dotenv = require("dotenv");

const path = require("path");

dotenv.config({ path: path.resolve(__dirname, '../../.env') });


module.exports = {
  HOST: "127.0.0.1", // "localhost",
  PORT: 27017,
  DB: process.env.DB_URL,
};
// mongodb+srv://<db_username>:<db_password>@project.ewo1t.mongodb.net/
// mongodb+srv://<db_username>:<db_password>@project.ewo1t.mongodb.net/?retryWrites=true&w=majority&appName=project
// mongodb+srv://databaseUser:aCA014_asdfCV000@project.ewolt.mongodb.net/prod_lottery
