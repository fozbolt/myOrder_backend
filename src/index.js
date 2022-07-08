import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import connect from './db.js';
import mongo from 'mongodb';
import auth from './auth.js';


const app = express(); // instanciranje aplikacije
const port = 3000; // port na kojem će web server slušati

app.use(cors());
app.use(express.json()); // automatski dekodiraj JSON poruke - bez toga ne možemo čitati npr body iz post requesta


app.get('/test', (req, res) => {
    //console.log('iz backenda');

    res.send('OK iz backenda');
});

app.post('/register', async (req, res) => {
    let user = req.body.new_user;
    
    try {
        let result = await auth.registerUser(user);

        res.status(201).send(true);
    } catch (e) {

        res.status(500).json({
            error: e.message,
        });
    }
});


app.post('/auth', async (req, res) => {
    let user = req.body;
    let username = user.username;
    let password = user.password;
   
    try {
        let result = await auth.authenticateUser(username, password);
        res.status(201).json(result);
    } catch (e) {
        res.status(500).json({
            error: e.message,
        });
    }
});



app.listen(port, () => console.log(`Slušam na portu ${port}!`));
