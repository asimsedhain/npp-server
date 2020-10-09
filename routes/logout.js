const express = require('express');
const router = express.Router();

const landingPageURL = 'http://localhost:3000/';

router.get('/', function(req, res, next) {
    res.cookie('ms_oauth_token', '', { maxAge: 1, domain: 'localhost' });
    res.cookie('ms_oauth_idtoken', '', { maxAge: 1, domain: 'localhost' });
    res.cookie('ms_oid', '', { maxAge: 1, domain: 'localhost' })
    return res.redirect(landingPageURL);
});

module.exports = router;
