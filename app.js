const express = require('express');
const cors = require('cors');
const path = require('path');
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

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/login', isDbConnected);
app.use('/login', loginRouter);
app.use('/logout', logoutRouter);
app.use('/courses', isDbConnected);
app.use('/courses', coursesRouter);

module.exports = app;
