const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/:user_id', async function(req, res) {
    const userCollection = req.app.locals.db.collection("users");

    const { user_id } = req.params;
    if (!user_id)
        return res.status(400).send('No user id specified.');

    const userExists = await userCollection.countDocuments({ oid: user_id });
    if (!userExists)
        return res.status(404).send('User does not exist.');
 
    return userCollection.findOne({ oid: user_id }, { projection: { _id: 0, columns: 1 } }).then(userData => {
        if (!userData || !userData.columns || !userData.columns.length)
            return res.status(200).send([]);
        console.log(`Retrieved ${userData.columns.length} user columns\n`);
        return res.status(200).send(userData.columns);
    })
    .catch(err => {
        console.error(err);
        return res.status(500).send('Failed to get user columns.');
    });
});

router.post('/:user_id/:column_id', async function(req, res) {
    const userCollection = req.app.locals.db.collection("users");
    console.log('');
    const { user_id, column_id } = req.params;
    if (!user_id || !column_id)
        return res.status(400).send('Need to specify a user ID and column ID.');

    const userExists = await userCollection.countDocuments({ oid: user_id });
    if (!userExists)
        return res.status(404).send('User does not exist.');
        
    return userCollection.findOne({ oid: user_id, 'columns.id': column_id }, { projection: { _id: 0, columns: 1 } })
    .then(userData => {
        if (!userData)
            return res.status(500).send('Failed to get user columns.');
        if (!userData.columns || !userData.columns.length)
            userData.columns = [];
        let column, index;
        column = userData.columns.find((c, ind) => {
            if (c.id === column_id) {
                index = ind;
                return c;
            }
        })
        if (!column)
            return res.status(404).send('User does not have this column.');
        const { name } = req.body;
        if (typeof name !== 'string')
            return res.status(400).send('Name must be a string.');

        const columns = userData.columns.filter(c => c.id !== column_id);
        columns.push({ id: column_id, name });

        return userCollection.updateOne({ oid: user_id }, { $set: { columns } }).then(dbResult => {
            if (!dbResult || !dbResult.modifiedCount)
                return res.status(204).send();
            return res.status(200).send();
        })
        .catch(err => {
            console.error(err);
            return res.status(500).send('Failed to save user columns.');
        });
    })
    .catch(err => {
        console.error(err);
        return res.status(500).send();
    });     
});

router.put('/:user_id', async function(req, res) {
    const userCollection = req.app.locals.db.collection("users");
    console.log('');
    const { user_id } = req.params;
    if (!user_id)
        return res.status(400).send('Need to specify a user ID.');

    const userExists = await userCollection.countDocuments({ oid: user_id });
    if (!userExists)
        return res.status(404).send('User does not exist.');
        
    return userCollection.findOne({ oid: user_id }, { projection: { _id: 0, columns: 1 } })
    .then(userData => {
        if (!userData)
            return res.status(500).send('Failed to get user columns.');
        if (!userData.columns || !userData.columns.length)
            userData.columns = [];

        const { name, id } = req.body;
        if (typeof name !== 'string' || typeof id !== 'string')
            return res.status(400).send('Name and ID must be strings.');

        userData.columns.push({ id, name });

        return userCollection.updateOne({ oid: user_id }, { $set: { columns: userData.columns } }).then(dbResult => {
            if (!dbResult || !dbResult.modifiedCount)
                return res.status(204).send();
            return res.status(200).send();
        })
        .catch(err => {
            console.error(err);
            return res.status(500).send('Failed to save user columns.');
        });
    })
    .catch(err => {
        console.error(err);
        return res.status(500).send();
    });     
});

router.delete('/:user_id/:column_id', async function(req, res) {
    const userCollection = req.app.locals.db.collection("users");
    console.log('');
    const { user_id, column_id } = req.params;
    if (!user_id || !column_id)
        return res.status(400).send('Need to specify a user ID and column ID.');

    const userExists = await userCollection.countDocuments({ oid: user_id });
    if (!userExists)
        return res.status(404).send('User does not exist.');
        
    return userCollection.findOne({ oid: user_id, 'columns.id': column_id }, { projection: { _id: 0, columns: 1 } })
    .then(userData => {
        if (!userData)
            return res.status(500).send('Failed to get user columns.');
        if (!userData.columns || !userData.columns.length)
            return res.status(204).send();
        let column, index;
        column = userData.columns.find((c, ind) => {
            if (c.id === column_id+'') {
                index = ind;
                return c;
            }
        })
        if (!column)
            return res.status(404).send('User does not have this column.');

        return userCollection.updateOne({ oid: user_id }, { $pull: { columns: { id: column_id } } }).then(dbResult => {
            if (!dbResult || !dbResult.modifiedCount)
                return res.status(204).send();
            return res.status(200).send();
        })
        .catch(err => {
            console.error(err);
            return res.status(500).send('Failed to save user columns.');
        });
    })
    .catch(err => {
        console.error(err);
        return res.status(500).send();
    });     
});

module.exports = router;
