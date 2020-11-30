const express = require('express');
const router = express.Router();
const axios = require('axios');

/* Take a JWT from Microsoft, obtain an OAuth token with it, and use it to create or confirm the existence of a user profile */
router.get('/', function(req, res) {
    const userCollection = req.app.locals.db.collection("users");

    const { error, error_description, code } = req.query;
    if (error)
        return res.status(500).send(`${error} - ${error_description}`);

    return axios({
        url: `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/token`,
        method: 'post',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        data: `client_id=${process.env.CLIENT_ID}&grant_type=authorization_code&redirect_uri=${encodeURI(process.env.REDIRECT_URL)}&response_mode=query&scope=openid+profile&code=${code}&client_secret=${encodeURIComponent(process.env.CLIENT_SECRET)}`
    })
    .then(async response => {
        //console.log(response.data);
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
            return res.status(500).send();
        }
        if (!oid)
            return res.status(500).send('Failed to get identifier.');
        // Check if an account is associated with this OID in the DB.
        return userCollection.countDocuments({ oid }).then(async exists => {
            if (!exists) { // If not, create one before redirecting to the dashboard.
                let failedToCreate;
                await userCollection.insertOne({ oid, email, name, courses: {} })
                .then(dbResult => {
                    if (!dbResult || !dbResult.insertedCount)
                        failedToCreate = true;
                })
                .catch(err => {
                    console.error(err);
                    failedToCreate = true;
                });
                if (failedToCreate)
                    return res.status(500).send('Failed to create user.');
            }
            res.cookie('ms_oid', oid, { maxAge: response.data.expires_in*1000, domain: 'localhost' })
            return res.redirect(process.env.DASHBOARD_URL);
        });
    })
    .catch(err => {
        console.error(err);
        return res.status(500).send();
    });
});

module.exports = router;
