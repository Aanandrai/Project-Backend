const { authJwt } = require("../../middlewares");
const controller = require("../../controllers/subAdmin/paymentTerm.controller");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept");
    next();
  });

  // Create
  app.post(
    "/api/subadmin/addpaymentterm",
    [authJwt.verifyToken, authJwt.isSubAdmin],
    controller.addPaymentTerm
  );

  // Read all of All 
  app.get(
    "/api/subadmin/getpaymenttermAll",
    [authJwt.verifyToken, authJwt.isSubAdmin],
    controller.readPaymentTermBySubAdminIdAll
  );

  app.get(
    "/api/subadmin/getpaymenttermSuperVisor",
    [authJwt.verifyToken, authJwt.isSubAdmin],
    controller.readPaymentTermOfSuperVisor
  );

  app.get(
    "/api/subadmin/getpaymenttermSeller",
    [authJwt.verifyToken, authJwt.isSubAdmin],
    controller.readPaymentTermOfSeller
  );

  // Update
  app.patch(
    "/api/subadmin/updatepaymentterm/:id",
    [authJwt.verifyToken, authJwt.isSubAdmin],
    controller.updatePaymentTerm
  );

  // Delete
  app.delete(
    "/api/subadmin/deletepaymentterm/:id",
    [authJwt.verifyToken, authJwt.isSubAdmin],
    controller.deletePaymentTerm
  );
};