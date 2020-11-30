const express = require('express');
const router = express.Router();

router.get('/', function(req, res) {
    res.cookie('ms_oauth_token', '', { maxAge: 0, domain: 'localhost' });
    res.cookie('ms_oauth_idtoken', '', { maxAge: 0, domain: 'localhost' });
    res.cookie('ms_oid', '', { maxAge: 0, domain: 'localhost' })
    return res.redirect(process.env.LANDING_PAGE_URL);
});

module.exports = router;
