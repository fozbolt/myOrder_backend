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


app.get('/product_types', async (req, res) => {
    let db = await connect();
    let result= undefined
    try{
        result = await db.collection('product_types').findOne()
        res.json(result);
    } catch (err) {
        //console.error(err)
        res.send(err);
    }
    
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



app.post('/new_order', async (req, res) => {
    let db = await connect();
    let data = req.body;
    
    if (!(data.items || data.orderInfo)){
        res.json({
            status: 'fail',
            reason: 'incomplete_order'
        })
        return
    }

    let result = await db.collection('orders').insertOne(data);
    if (result.insertedCount == 1) {
        res.json({
            status: 'success',
            id: result.insertedId,
        });
    } else {
        res.json({
            status: 'fail',
        });
    }
});



app.post('/leave_feedback', async (req, res) => {
    let db = await connect();
    let data = req.body;

    let result = await db.collection('feedbacks').insertOne(data);
    if (result.insertedCount == 1) {
        res.json({
            status: 'success',
            id: result.insertedId,
        });
    } else {
        res.json({
            status: 'fail',
        });
    }
});




app.get('/order_info/:id', async (req, res) => {
    let id = req.params.id;

    let db = await connect();
    let result= undefined

    try{
        result = await db.collection('orders').findOne({ _id: mongo.ObjectId(id) });
        res.json(result);
    } catch (err) {
        //console.error(err)
        res.send(err);
    }
    
});


//javlja se kad zovem posts/:type pa trenutno komentiram (dolje promijenjeno u menu pa se sad moze koristiti)
app.get('/food_list/:id', [auth.verify], async (req, res) => {
 
    let id = req.params.id;
    let db = await connect();
    let document = await db.collection('menu').findOne({ _id: mongo.ObjectId(id) });

    res.json(document);
});



app.get('/menu/:type/:category/:subcategory', [auth.verify], async (req, res) => {

    let query = req.query;
    let type = req.params.type.charAt(0) + req.params.type.substring(1).toLowerCase();
    let category = req.params.category
    let subCategory = req.params.subcategory
    let db = await connect();

    let filter={
        type: type,
        category: category
    };

    if (subCategory != 'All') filter.subCategory = subCategory


    //fetch only by category and filter result in backend
    let cursor = await db.collection('menu').find(filter);
    let results = await cursor.toArray();
    //console.log(results)

    let values = []
    if (query._any ){
        let pretraga = query._any;
        values = pretraga.split(' ');

        let keys = ['name', 'price']; //add more later

        
        //source: https://stackoverflow.com/questions/68005153/search-by-multiple-keys-and-values-javascript
        let regex = new RegExp(values.join('|'), 'i')
        let output =  results.filter(e =>  keys.some(k => regex.test(e[k])) )
        
        
        res.json(output); 
    }

    else res.json(results);
});



// ovaj search nisam osposobio da radi s kategorijama - radi problem kada nema search terma jer ne moze and uvjet biti prazan i na subcategory='all' filtrira doslovno po "All" - drugi problem je sada rijesen
// app.get('/menu/:type/:category/:subcategory', [auth.verify], async (req, res) => {

//     let db = await connect();
//     let query = req.query;
//     let type = req.params.type.charAt(0) + req.params.type.substring(1).toLowerCase();
//     let category = req.params.category
//     let subCategory = req.params.subcategory
//     let selekcija = {};

//     console.log(type, category, subCategory)

//     //refactor? || type!==undefined || category!==undefined || subCategory!==undefined  staro
//     if  (type!==undefined && category!==undefined && subCategory!==undefined ) {
//         let terms = []
//         if (query._any ){
//             let pretraga = query._any;
//             terms = pretraga.split(' ');
//         }
//         // za upit: /posts?_all=pojam1 pojam2
    

//         //dodati i type,category i subcategory u atribute? Da, na kraju
//         let atributi = ['name', 'price'];

//         selekcija = {
//             $and: [],
//         };

//         terms.forEach((term) => {
//             let or = {
//                 $or: [],
//                 $and: []
//             };

    
//             atributi.forEach((atribut) => {
//                 or.$or.push({ [atribut]: new RegExp(term, 'i')});
//                 or.$and.push({$and :[ { "type": type}, { "category": category}, { "subCategory": subCategory}] })
//             });

//             selekcija.$and.push(or);
//         });
//     }
//     console.log(selekcija);

//     let cursor = await db.collection('menu').find(selekcija);
//     let results = await cursor.toArray();

//     res.json(results);
// });


app.listen(port, () => console.log(`Slušam na portu ${port}!`));
