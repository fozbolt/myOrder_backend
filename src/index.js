import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import connect from './db.js';
import mongo from 'mongodb';
import auth from './auth.js';
import _ from 'lodash';


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

//javlja se kad zovem posts/:type pa trenutno komentiram (dolje promijenjeno u menu pa se sad moze koristiti)
// app.get('/posts/:id', [auth.verify], async (req, res) => {
//     let id = req.params.id;
//     let db = await connect();
//     let document = await db.collection('posts').findOne({ _id: mongo.ObjectId(id) });

//     res.json(document);
// });



app.get('/menu/:type/:category/:subcategory', [auth.verify], async (req, res) => {

    let db = await connect();
    let query = req.query;
    let type = req.params.type
    let category = req.params.category
    let subCategory = req.params.subCategory
    let selekcija = {};


    //refactor? || type!==undefined || category!==undefined || subCategory!==undefined  staro
    if (query._any ) {
        // za upit: /posts?_all=pojam1 pojam2
        let pretraga = query._any;
        let terms = pretraga.split(' ');

        //dodati i type,category i subcategory u atribute? Da, na kraju
        let atributi = ['name', 'price'];

        selekcija = {
            $and: [],
        };

        terms.forEach((term) => {
            let or = {
                $or: [],
                $and: []
            };

    
            atributi.forEach((atribut) => {
                or.$or.push({ [atribut]: new RegExp(term, 'i')});
                or.$and.push({$and :[ { "type": type}, { "category": category}] })
            });

            selekcija.$and.push(or);
        });
    }
    console.log(selekcija);

    let cursor = await db.collection('menu').find(selekcija);
    let results = await cursor.toArray();

    res.json(results);
});


app.listen(port, () => console.log(`Slušam na portu ${port}!`));
