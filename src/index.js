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
//app.use(express.json()); // automatski dekodiraj JSON poruke


app.get('/test', (req, res) => {
    console.log('iz backenda');
    console.log(req.varijabla_1);
    console.log(req.varijabla_2);

    res.send('OK');
});

app.listen(port, () => console.log(`Slušam na portu ${port}!`));
