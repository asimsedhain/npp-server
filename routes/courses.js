const express = require('express');
const router = express.Router();
const axios = require('axios');

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

router.get('/:identifiers', async function(req, res) {
    const courseCollection = req.app.locals.db.collection("courses");
    const userCollection = req.app.locals.db.collection("users");
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
        let userExists;
        if (identifiers.includes('-') && identifiers.length > 30) { // likely oid format
            userExists = await userCollection.countDocuments({ oid: identifiers });
        }
        if (userExists) {
            return userCollection.findOne({ oid: identifiers }, { projection: { _id: 0, courses: 1 } }).then(userData => {
                if (!userData || !userData.courses || !userData.courses.length)
                    return res.status(500).send('Failed to get user courses.');
                console.log(`Retrieved ${userData.courses.length} user courses\n`);
                return res.status(200).send(userData.courses);
            })
            .catch(err => {
                console.error(err);
                return res.status(500).send();
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
        return res.status(200).send(docs);
    })
    .catch(err => {
        console.error(err);
        return res.status(500).send();
    });
});

router.get('/:user_id/:course_id', async function(req, res) {
    const userCollection = req.app.locals.db.collection("users");
    console.log('');
    const { user_id, course_id } = req.params;
    if (!user_id || !course_id)
        return res.status(400).send('Need to specify a user ID and course ID.');

    const userExists = await userCollection.countDocuments({ oid: user_id });
    if (!userExists)
        return res.status(404).send('User does not exist.');
        
    return userCollection.findOne({ oid: user_id, 'courses.id': course_id }, { projection: { _id: 0, 'courses.$': 1 } })
    .then(userData => {
        if (!userData || !userData.courses || !userData.courses.length)
            return res.status(500).send('Failed to get user course.');
        if (!userData.courses.find(c => c.id === course_id))
            return res.status(404).send('User does not have this course.');
        console.log(`Retrieved user course\n`);
        return res.status(200).send(userData.courses.find(c => c.id === course_id));
    })
    .catch(err => {
        console.error(err);
        return res.status(500).send();
    });     
});

router.post('/:user_id', async function(req, res) {
    const courseCollection = req.app.locals.db.collection("courses");
    const userCollection = req.app.locals.db.collection("users");
    const { user_id } = req.params;
    if (!user_id)
        return res.status(400).send('No user id specified.');
    const userExists = await userCollection.countDocuments({ oid: user_id });
    if (!userExists)
        return res.status(404).send('User does not exist.');
    
    // validate course array
    const courseArray = req.body;
    if (!Array.isArray(courseArray))
        return res.status(400).send('Body must be an array of courses.');
    const validCourseIDs = await courseCollection.find({}, { projection: { _id: 0, id: 1 } }).toArray().then(arr => arr.map(c => c.id));
    const courses = [];
    for (const i in courseArray) {
        const c = courseArray[i];
        if (!c.id || !validCourseIDs.includes(c.id))
            return res.status(400).send(`Course with id "${c.id}" does not exist.`);
        for (const prop of ['deptID', 'courseNumber', 'name', 'time'])
            if (!c[prop])
                return res.status(400).send(`Course "${c.id}" is missing the field "${prop}".`);
        if (!c.time.time_start || !c.time.time_end || !Array.isArray(c.time.days))
            return res.status(400).send(`Course "${c.id}" has an invalid "time" field.`);
        for (const prop of ['prerequisites', 'corequisites', 'requirementsTo'])
            if (c[prop])
                for (const j in c[prop])
                    if (!validCourseIDs.includes(c[prop][j]))
                        return res.status(400).send(`Course "${c[prop][j]}" does not exist (from field "${prop}").`);
        courses.push({
            id: c.id,
            deptID: c.deptID,
            courseNumber: c.courseNumber,
            name: c.name,
            description: c.description || '',
            prerequisites: c.prerequisites || [],
            corequisites: c.corequisites || [],
            requirementsTo: c.requirementsTo || [],
            time: c.time,
            labels: c.labels || [],
            column: c.column,
            enrolled: c.enrolled || false,
            planned: c.planned || false,
            completed: c.completed || false
        });
    }

    return userCollection.updateOne({ oid: user_id }, { $set: { courses } }).then(dbResult => {
        if (!dbResult || !dbResult.modifiedCount)
            return res.status(204).send();
        return res.status(200).send();
    })
    .catch(err => {
        console.error(err);
        return res.status(500).send('Failed to save user courses.');
    });
});

router.get('/', async function(req, res) {
    const courseCollection = req.app.locals.db.collection("courses");
    console.log('');
    return courseCollection.find({}, { projection: { _id: 0 } }).toArray()
    .then(docs => {
        console.log(`Retrieved all ${docs.length} courses`);
        if (!docs || !docs.length)
            return res.status(500).send('Failed to get all courses.');
        return res.status(200).send(docs);
    })
    .catch(err => {
        console.error(err);
        return res.status(500).send();
    });
});

module.exports = router;
