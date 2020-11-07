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
 
    return userCollection.findOne({ oid: user_id }, { projection: { _id: 0, labels: 1 } }).then(userData => {
        if (!userData || !userData.labels || !userData.labels.length)
            return res.status(200).send([]);
        console.log(`Retrieved ${userData.labels.length} user labels\n`);
        return res.status(200).send(userData.labels);
    })
    .catch(err => {
        console.error(err);
        return res.status(500).send('Failed to get user labels.');
    });
});

router.post('/:user_id/:label_id', async function(req, res) {
    const userCollection = req.app.locals.db.collection("users");
    console.log('');
    const { user_id, label_id } = req.params;
    if (!user_id || !label_id)
        return res.status(400).send('Need to specify a user ID and label ID.');

    const userExists = await userCollection.countDocuments({ oid: user_id });
    if (!userExists)
        return res.status(404).send('User does not exist.');
        
    return userCollection.findOne({ oid: user_id, 'labels.id': label_id }, { projection: { _id: 0, labels: 1 } })
    .then(userData => {
        if (!userData)
            return res.status(500).send('Failed to get user labels.');
        if (!userData.labels || !userData.labels.length)
            userData.labels = [];
        let label, index;
        label = userData.labels.find((c, ind) => {
            if (c.id === label_id) {
                index = ind;
                return c;
            }
        })
        if (!label)
            return res.status(404).send('User does not have this label.');
        const { name, color } = req.body;
        if (typeof name !== 'string' || typeof color !== 'string')
            return res.status(400).send('Name and color must both be strings.');

        const labels = userData.labels.filter(c => c.id !== label_id);
        labels.push({ id: label_id, name, color });

        return userCollection.updateOne({ oid: user_id }, { $set: { labels } }).then(dbResult => {
            if (!dbResult || !dbResult.modifiedCount)
                return res.status(204).send();
            return res.status(200).send();
        })
        .catch(err => {
            console.error(err);
            return res.status(500).send('Failed to save user labels.');
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
        
    return userCollection.findOne({ oid: user_id }, { projection: { _id: 0, labels: 1 } })
    .then(userData => {
        if (!userData)
            return res.status(500).send('Failed to get user labels.');
        if (!userData.labels || !userData.labels.length)
            userData.labels = [];

        const { name, color, id } = req.body;
        if (typeof name !== 'string' || typeof color !== 'string' || typeof id !== 'string')
            return res.status(400).send('Name, ID, and color must all be strings.');

        userData.labels.push({ id, name, color });

        return userCollection.updateOne({ oid: user_id }, { $set: { labels: userData.labels } }).then(dbResult => {
            if (!dbResult || !dbResult.modifiedCount)
                return res.status(204).send();
            return res.status(200).send();
        })
        .catch(err => {
            console.error(err);
            return res.status(500).send('Failed to save user labels.');
        });
    })
    .catch(err => {
        console.error(err);
        return res.status(500).send();
    });     
});

router.delete('/:user_id/:label_id', async function(req, res) {
    const userCollection = req.app.locals.db.collection("users");
    console.log('');
    const { user_id, label_id } = req.params;
    if (!user_id || !label_id)
        return res.status(400).send('Need to specify a user ID and label ID.');

    const userExists = await userCollection.countDocuments({ oid: user_id });
    if (!userExists)
        return res.status(404).send('User does not exist.');
        
    return userCollection.findOne({ oid: user_id, 'labels.id': label_id }, { projection: { _id: 0, labels: 1 } })
    .then(userData => {
        if (!userData)
            return res.status(500).send('Failed to get user labels.');
        if (!userData.labels || !userData.labels.length)
            return res.status(204).send();
        let label, index;
        label = userData.labels.find((c, ind) => {
            if (c.id === label_id+'') {
                index = ind;
                return c;
            }
        })
        if (!label)
            return res.status(404).send('User does not have this label.');

        return userCollection.updateOne({ oid: user_id }, { $pull: { labels: { id: label_id } } }).then(dbResult => {
            if (!dbResult || !dbResult.modifiedCount)
                return res.status(204).send();
            return res.status(200).send();
        })
        .catch(err => {
            console.error(err);
            return res.status(500).send('Failed to save user labels.');
        });
    })
    .catch(err => {
        console.error(err);
        return res.status(500).send();
    });     
});

module.exports = router;
