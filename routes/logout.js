const express = require('express');
const router = express.Router();

router.get('/', function(req, res) {
    res.cookie('ms_oauth_token', '', { maxAge: 1, domain: 'localhost' });
    res.cookie('ms_oauth_idtoken', '', { maxAge: 1, domain: 'localhost' });
    res.cookie('ms_oid', '', { maxAge: 1, domain: 'localhost' })
    return res.redirect(process.env.LANDING_PAGE_URL);
});

module.exports = router;
