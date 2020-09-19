var express = require("express");
var router = express.Router();

/* GET home page. */
router.get("/", function (req, res, next) {
	res.json({ "Npp Version": "1.0" });
});

router.get("/paste", function (req, res, next) {
	res.json({ "Paste Version": "3.0" });
});

module.exports = router;
