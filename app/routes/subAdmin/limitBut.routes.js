const { authJwt } = require("../../middlewares");
const controller = require("../../controllers/subAdmin/limitBut.controller");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept");
    next();
  });

  // Add Sub Admin
  app.post(
    "/api/subadmin/addlimitbut",
    [authJwt.verifyToken, authJwt.isSubAdmin],
    controller.addLimitBut
  );

  // Read Sub Admin
  app.get(
    "/api/subadmin/getLimitButAll",
    [authJwt.verifyToken, authJwt.isSubAdmin],
    controller.getLimitButAll
  );

  app.get(
    "/api/subadmin/getLimitButSeller",
    [authJwt.verifyToken, authJwt.isSubAdmin],
    controller.getLimitButSeller
  );

  app.get(
    "/api/subadmin/getLimitButSuperVisor",
    [authJwt.verifyToken, authJwt.isSubAdmin],
    controller.getLimitButSuperVisor 
  );

  // Update Sub Admin
  app.patch(
    "/api/subadmin/updatelimitbut/:id",
    [authJwt.verifyToken, authJwt.isSubAdmin],
    controller.updateLimitBut
  );

  // Delete Sub Admin
  app.delete(
    "/api/subadmin/deletelimitbut/:id",
    [authJwt.verifyToken, authJwt.isSubAdmin],
    controller.deleteLimitBut
  );
};