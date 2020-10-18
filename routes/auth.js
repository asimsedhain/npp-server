const express = require('express');
const router = express.Router();
const axios = require('axios');

const dashboardURL =process.env.DASHBOARD_URL;
const msClient = {
	tenantId: '8f671598-d6fe-4bb6-aa89-03fc7126dba1',
	id: '02d1c5dc-917d-495a-bfe5-fee48aa54867',
    redirectURI:process.env.REDIRECT_URL,
    secret: process.env.DEGREEVIS_CLIENT_SECRET
}

const dbDeets = {
    user: 'Test',
    pass: process.env.DEGREEVIS_DB_PASS,
    db: 'degreevis'
}
const MongoClient = require('mongodb').MongoClient;
const uri = `mongodb+srv://${dbDeets.user}:${dbDeets.pass}@cluster0.bj2wy.mongodb.net/${dbDeets.db}?retryWrites=true&w=majority`;
const mongoClient = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
let userCollection;
mongoClient.connect(err => {
    if (err) console.error(err);
    else console.log('Database Connected.');
    userCollection = mongoClient.db("degreevis").collection("users");
    userCollection.countDocuments({})
    .then(count => console.log(`There are ${count} users in the DB.`))
    .catch(console.error);
});


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
            return res.status(500);
        }
        if (!oid)
            return res.status(500).send('Failed to get identifier.');
        // Check if an account is associated with this OID in the DB.
        return userCollection.countDocuments({ oid }).then(async exists => {
            if (!exists) { // If not, create one before redirecting to the dashboard.
                let failedToCreate;
                await userCollection.insertOne({ oid, email, name, courses: [] })
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
            res.cookie('ms_oid', oid, { maxAge: 696969, domain: 'localhost' })
            return res.redirect(dashboardURL);
        });
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
