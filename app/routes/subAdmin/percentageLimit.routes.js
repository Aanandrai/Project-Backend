// 181024
const { authJwt } = require("../../middlewares");
const controller = require("../../controllers/subAdmin/percentageLimit.controller");

module.exports = function (app) {
    app.use(function (req, res, next) {
      res.header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept");
      next();
    });

    
  // Add Sub Admin PercentageLimit
  app.post(
    "/api/subadmin/addpercentagelimit",
    [authJwt.verifyToken, authJwt.isSubAdmin],
    controller.addPercentageLimit
  );

  // // Read Sub Admin PercentageLimit
  app.get(
    "/api/subadmin/getpercentagelimit",
    [authJwt.verifyToken, authJwt.isSubAdmin],
    controller.getPercentageLimit
  );

  // Update Sub Admin PercentageLimit
  app.patch(
    "/api/subadmin/updatepercentagelimit/:id",
    [authJwt.verifyToken, authJwt.isSubAdmin],
    controller.updatePercentageLimit
  );

  // Delete Sub Admin PercentageLimit
//   app.delete(
//     "/api/subadmin/deleteblocknumber/:id",
//     [authJwt.verifyToken, authJwt.isSubAdmin],
//     controller.deleteBlockNumber
//   );
};