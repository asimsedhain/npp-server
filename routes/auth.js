const express = require('express');
const router = express.Router();
const axios = require('axios');

const dashRedirect = 'http://localhost:3000/dashboard';
const msClient = {
	tenantId: '8f671598-d6fe-4bb6-aa89-03fc7126dba1',
	id: '02d1c5dc-917d-495a-bfe5-fee48aa54867',
    redirectURI: 'http://localhost:3001/login',
    secret: 'LCy-4k.tLOY0~6zzBA~5iKs7o1Ogb.882T'
}


/* Take a JWT from Microsoft, obtain an OAuth token with it, and use it to create or confirm the existence of a user profile */
router.get('/', function(req, res, next) {
    const { error, error_description } = req.query;
    if (error)
        return res.status(500).send(`${error} - ${error_description}`);
    const { code, state } = req.query;
    return axios({
        url: `https://login.microsoftonline.com/${msClient.tenantId}/oauth2/v2.0/token`,
        method: 'post',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        data: `client_id=${msClient.id}&grant_type=authorization_code&redirect_uri=${encodeURI(msClient.redirectURI)}&response_mode=query&scope=openid&code=${code}&client_secret=${encodeURIComponent(msClient.secret)}`
    })
    .then(response => {
        console.log(response.data);
        res.cookie('ms_oauth_token', response.data.access_token, { maxAge: response.data.expires_in*1000, domain: 'localhost' });
        res.cookie('ms_oauth_idtoken', response.data.id_token, { maxAge: response.data.expires_in*1000, domain: 'localhost' });
        let oid, email, name;
        try {
            const atPieces = response.data.access_token.split('.');
            const decodedAT = Buffer.from(atPieces[1], 'base64').toString('binary');
            const aTokenInfo = JSON.parse(decodedAT);
            oid = aTokenInfo.oid;
            email = aTokenInfo.upn;
            name = aTokenInfo.name;
        } catch(err) {
            console.error(err);
            return res.status(500);
        }
        if (!oid)
            return res.status(500).send('Failed to get identifier.');
        // TODO: Check if an account is associated with this OID in the DB. If not, create one (using oid, email?, and name) before redirecting to the dashboard.
        res.cookie('ms_oid', oid, { maxAge: 696969, domain: 'localhost' })
        return res.redirect(dashRedirect);
    })
    .catch(err => {
        console.error(err);
        return res.status(500);
    });
});

/* Use a refresh token to obtain a new bearer token and confirm the existence of a user profile. !! only needed/available when using offline_access scope !! */
router.get('/refresh', function(req, res, next) {
    res.send('respond with a resource');
});

module.exports = router;
