const express = require('express');
const router = express.Router();
const axios = require('axios');

const dbDeets = {
    user: 'Test',
    pass: process.env.DEGREEVIS_DB_PASS,
    db: 'degreevis'
}
const MongoClient = require('mongodb').MongoClient;
const uri = `mongodb+srv://${dbDeets.user}:${dbDeets.pass}@cluster0.bj2wy.mongodb.net/${dbDeets.db}?retryWrites=true&w=majority`;
const mongoClient = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
let courseCollection, userCollection;
mongoClient.connect(err => {
    if (err) console.error(err);
    else console.log('Database Connected.');
    courseCollection = mongoClient.db("degreevis").collection("courses");
    userCollection = mongoClient.db("degreevis").collection("users");
    /*courseCollection.countDocuments({})
    .then(count => console.log(`There are ${count} courses in the DB.`))
    .catch(console.error);*/
});


const collegeNames = {
    CAS: 'College of Arts and Sciences',
    CEP: 'College of Education and Psychology',
    CE: 'College of Engineering',
    CNH: 'College of Nursing and Health Sciences',
    COB: 'Soules College of Business',
    COP: 'The Ben and Maytee Fisch College of Pharmacy'
}
// this is by no means a complete and accurate list, but should be good enough for now
const collegeDepts = {
    CAS: ['ART', 'BIOL', 'CHEM', 'CHIN', 'COMD', 'COMM', 'CRIJ', 'ECON', 'ENGL', 'EMBA', 'FREN', 'GEOG', 'GEOL', 'GERM', 'HIST', 'HUMA', 'JAPN', 'JOUR', 'LART', 'LATN', 'MATH', 'MUSI', 'PHIL', 'PHYS', 'POLS', 'RELI', 'SOCI', 'SPAN', 'SPCM', 'THTR'],
    CEP: ['EDAD', 'EDBE', 'EDCI', 'EDEC', 'EDFB', 'EDLR', 'EDMD', 'EDRM', 'EDSI', 'EDSL', 'EDSP', 'EDST', 'EDUC', 'EDVO', 'ELED', 'EPSY', 'HLED', 'MTED', 'MUED', 'PSYC', 'PYED', 'SSED'],
    CE: ['CENG', 'CHEN', 'CMGT', 'EENG', 'ENGR', 'MENG'],
    CNH: ['ALHS', 'CNHS', 'EHCA', 'ENIF', 'HECC', 'KINE', 'MEDT', 'NURS', 'OCTH', 'RNBS'],
    COB: ['ACCT', 'BLAW', 'COSC', 'CSCI', 'FINA', 'GENB', 'HRD', 'MANA', 'MARK', 'MCOM', 'RETL', 'TECH'],
    COP: ['PHAR']
}
// TODO: get a proper version of this list instead (or remove this & the code that uses it)
let allDepts = [];
for (const cid in collegeDepts) {
    allDepts = allDepts.concat(collegeDepts[cid]);
}

router.get('/:identifiers', async function(req, res, next) {
    console.log('');
    const { identifiers } = req.params;
    if (!identifiers)
        return res.status(400).send('No identifiers (college id/course departments) specified.');

    let abbrArray = [];
    if (collegeDepts[identifiers]) { // identifiers is a college id
        console.log(`Converting college ID "${identifiers}" (${collegeNames[identifiers]}) to department list`);
        abbrArray = collegeDepts[identifiers];
    } else if (identifiers.includes(',')) { // identifiers is a list of course departments
        abbrArray = identifiers.split(',').map(i => i.trim());
    } else { // identifiers is a user id or single course department
        const userExists = await userCollection.countDocuments({ user_id: identifiers });
        if (userExists) {
            return userCollection.findOne({ user_id: identifiers }, { projection: { _id: 0, courses: 1 } }).then(userData => {
                if (!userData || !userData.courses || !userData.courses.length)
                    return res.status(500).send('Failed to get user courses.');
                console.log(`Retrieved ${userData.courses.length} user courses\n`);
                return res.send(userData.courses);
            })
            .catch(err => {
                console.error(err);
                return res.status(500);
            });
        }
        abbrArray = [identifiers];
    }
    if (abbrArray.find(i => !allDepts.includes(i)))
        return res.status(400).send(`Identifier "${abbrArray.find(i => !allDepts.includes(i))}" is not a valid course department.`);

    return courseCollection.find({ deptID: { $in: abbrArray } }, { projection: { _id: 0 } }).toArray()
    .then(docs => {
        if (!docs || !docs.length)
            return res.status(500).send('Failed to get courses.');
        console.log(`Retrieved ${docs.length} courses from departments:\n[${abbrArray.join(', ')}]\n`);
        return res.send(docs);
    })
    .catch(err => {
        console.error(err);
        return res.status(500);
    });
});

router.get('/:user_id/:course_id', async function(req, res, next) {
    console.log('');
    const { user_id, course_id } = req.params;
    if (!user_id || !course_id)
        return res.status(400).send('Need to specify a user ID and course ID.');

    const userExists = await userCollection.countDocuments({ user_id });
    if (!userExists)
        return res.status(404).send('User does not exist.');
        
    return userCollection.findOne({ user_id: identifiers, 'courses.id': course_id }, { projection: { _id: 0, courses: 1 } })
    .then(userData => {
        if (!userData || !userData.courses || !userData.courses.length)
            return res.status(500).send('Failed to get user course.');
        if (!userData.courses.find(c => c.id === course_id))
            return res.status(404).send('User does not have this course.');
        console.log(`Retrieved user course\n`);
        return res.send(userData.courses.find(c => c.id === course_id));
    })
    .catch(err => {
        console.error(err);
        return res.status(500);
    });
        
});

router.get('/', async function(req, res, next) {
    console.log('');
    return courseCollection.find({}, { projection: { _id: 0 } }).toArray()
    .then(docs => {
        console.log(`Retrieved all ${docs.length} courses`);
        if (!docs || !docs.length)
            return res.status(500).send('Failed to get all courses.');
        return res.send(docs);
    })
    .catch(err => {
        console.error(err);
        return res.status(500);
    });
});

module.exports = router;
