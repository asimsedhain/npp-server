const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const { MongoClient } = require('mongodb');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const loginRouter = require('./routes/login');
const logoutRouter = require('./routes/logout');
const coursesRouter = require('./routes/courses');

const app = express();

app.use(logger('dev'));
app.use(cors())
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// connect to the database
const dbURI = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bj2wy.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
const dbClient = new MongoClient(dbURI, { useNewUrlParser: true, useUnifiedTopology: true });

dbClient.connect(err => {
    if (err) console.error(err);
    else console.log('Database Connected.');
    app.locals.dbConnected = true;
    app.locals.db = dbClient.db(process.env.DB_NAME);
});

// add middleware for easy db connection check
function isDbConnected(req, res, next) {
    if (!app.locals.dbConnected)
        return res.status(503).send(`Database disconnected.`);
    return next();
}

// authentication middleware
function isAuthValid(req, res, next) {
    const token = req.cookies.ms_oauth_token;
    if (!token)
        return res.status(401).send(`No access token provided.`);
    const parts = token.split('.');
    if (parts.length < 3)
        return res.status(401).send(`Invalid access token provided.`);
    try {
        const data = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        req.oid = data.oid; // used for verification later
    } catch(err) {
        console.error(err);
        return res.status(500).send();
    }
    return axios({
        url: 'https://graph.microsoft.com/oidc/userinfo',
        method: 'get',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    }).then(response => {
        console.log(response.data);
        return next();
    }).catch(err => {
        console.error(err.response ? err.response.data.error : err);
        return res.status(500).send();
    });
}

// oid to user_id matching middleware
function isOidValid(req, res, next) {
    const id = req.params.user_id;
    if (id.includes('-') && id.length > 30 && req.oid !== id) { // likely oid format
        return res.status(403).send('User ID specified does not match authorized user.');
    }
    return next();
}

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/login', isDbConnected);
app.use('/login', loginRouter);
app.use('/logout', logoutRouter);
app.use('/courses', isDbConnected);
app.use('/courses', isAuthValid);
app.use('/courses', isOidValid);
app.use('/courses', coursesRouter);

module.exports = app;
