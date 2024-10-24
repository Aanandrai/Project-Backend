const { authJwt } = require("../../middlewares");

// import the report controller 13/10 also 
//also update it to constroller calling
const reportcontroller = require("../../controllers/admin/report.controller");
const controller = require("../../controllers/admin/subAdmin.controller");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept");
    next();
  });

  // ticket sale reports
  app.get(
    "/api/admin/getsalereports",
    [authJwt.verifyToken],
    reportcontroller.getSaleReports
  );

  app.get(
    "/api/admin/getsubadmin",
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.getSubadmin
  );

  app.get(
    "/api/sbuadmin/getselldetails",
    [authJwt.verifyToken],
    reportcontroller.getSellDetails
  );
  app.get(
    "/api/sbuadmin/getselldetailsbygamecategory",
    [authJwt.verifyToken],
    reportcontroller.getSellDetailsByGameCategory
  );
  app.get(
    "/api/sbuadmin/getselldetailsallloterycategory",
    [authJwt.verifyToken],
    reportcontroller.getSellDetailsByAllLoteryCategory
  );
  app.get(
    "/api/sbuadmin/getsellgamenumberinfo",
    [authJwt.verifyToken],
    reportcontroller.getSellGameNumberInfo
  );
};
