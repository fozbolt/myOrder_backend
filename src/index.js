import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import connect from './db.js';
import mongo from 'mongodb';
import auth from './auth.js';
import _ from 'lodash';
import bcrypt from 'bcrypt';


const app = express(); // instanciranje aplikacije
const port = process.env.PORT || 5000 

app.use(cors());
app.use(express.json()); // automatski dekodiraj JSON poruke - bez toga ne možemo čitati npr body iz post requesta
app.use(express.urlencoded({ extended: true }));


app.get('/product_types', async (_req, res) => {
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


app.patch('/orders/:id', async (req, res) => {
    let doc = req.body;
    delete doc._id; delete doc.id;
    let id = req.params.id;
    let db = await connect();

    let result = await db.collection('orders').updateOne(
        { _id: mongo.ObjectId(id) },
        {
            $set: doc,
        }
    );
    if (result.modifiedCount == 1) {
        res.json({
            status: 'success',
            id: result.insertedId,
        });
    } else {
        res.status(500).json({
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


app.post('/subscribe', async (req, res) => {
    let db = await connect();
    let data = req.body;
    data.time = Date.now()

    let result = await db.collection('subscribers').insertOne(data);
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




app.get('/about_info', [auth.verify], async (req, res) => {
    let db = await connect();

    try{
        let cursor = await db.collection('about_us').find();
        let results = await cursor.toArray();
        
        res.json(results);

    } catch (err) {
        res.send(err);
    }
});


app.delete('/orders/:id', async (req, res) => {
    let db = await connect();
    let id = req.params.id;

    let result = await db.collection('orders').deleteOne(
        { _id: mongo.ObjectId(id) }

    );

    if (result.deletedCount == 1) {
        res.status(201).send();
    } else {
        res.status(500).json({
            status: 'fail',
        });
    }
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

    if (subCategory != 'All' && subCategory != 'undefined') filter.subCategory = subCategory
   

    //fetch only by category and filter result in backend
    let cursor = await db.collection('menu').find(filter);
    let results = await cursor.toArray();
    // console.log(results)

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




app.get('/orders/:status', [auth.verify], async (req, res) => {
    let query = req.query;
    let status = req.params.status

    let db = await connect();

    //fetch only by category and filter result in backend
    let cursor = await db.collection('orders').find({
        'orderInfo.orderStatus': status
    });
    let results = await cursor.toArray();

    let values = []

    if (query._any ){
        let pretraga = query._any;
        values = pretraga.split(' ');

        let keys = ['table', 'totalAmount', 'orderId']; //add more later

        
        //source: https://stackoverflow.com/questions/68005153/search-by-multiple-keys-and-values-javascript
        let regex = new RegExp(values.join('|'), 'i')
        let output =  results.filter(e =>  keys.some(k => regex.test(e.orderInfo[k])) )

        res.json(output); 
    }

    else res.json(results);
});




app.post('/calls', async (req, res) => {
    let db = await connect();
    let data = req.body;

    let result = await db.collection('calls').insertOne(data);
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



app.get('/calls/:status', [auth.verify], async (req, res) => {

    let query = req.query;
    let status = req.params.status

    let db = await connect();
   
    //fetch only by category and filter result in backend
    let cursor = await db.collection('calls').find({
        'status': status
    });
    let results = await cursor.toArray();

    let values = []
    
    if (query._any ){
        let pretraga = query._any;
        values = pretraga.split(' ');

        let keys = ['reason', 'table']; 

        
        //source: https://stackoverflow.com/questions/68005153/search-by-multiple-keys-and-values-javascript
        let regex = new RegExp(values.join('|'), 'i')
        let output =  results.filter(e =>  keys.some(k => regex.test(e[k])) )
        
        res.json(output); 
    }

    else res.json(results);
});



app.patch('/calls/:id', async (req, res) => {
    let doc = req.body;
    delete doc._id; delete doc.id;
    let id = req.params.id;
    let db = await connect();

    let result = await db.collection('calls').updateOne(
        { _id: mongo.ObjectId(id) },
        {
            $set: doc,
        }
    );
    if (result.modifiedCount == 1) {
        res.json({
            status: 'success',
            id: result.insertedId,
        });
    } else {
        res.status(500).json({
            status: 'fail',
        });
    }
});






//manager
app.post('/add_product', async (req, res) => {
    let db = await connect();
    let data = req.body;
    delete data.id

    let result = await db.collection('menu').insertOne(data);
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


app.patch('/update_product', async (req, res) => {
    let doc = req.body;
    let db = await connect();
    let id = doc.id;
    delete doc.id;
 
    let result = await db.collection('menu').updateOne(
        { _id: mongo.ObjectId(id) },
        {
            $set: doc,
        }
    );

    if (result.modifiedCount == 1) {
        res.json({
            status: 'success',
            id: result.insertedId,
        });
    } else {
        res.status(500).json({
            status: 'fail',
        });
    }
});


app.delete('/products/:id', async (req, res) => {
    let db = await connect();
    let id = req.params.id;

    let result = await db.collection('menu').deleteOne(
        { _id: mongo.ObjectId(id) }

    );

    if (result.deletedCount == 1) {
        res.status(201).send();
    } else {
        res.status(500).json({
            status: 'fail',
        });
    }
});

app.get('/employee_types', async (_req, res) => {
    let db = await connect();
    let result= undefined
    try{
        result = await db.collection('employee_types').findOne()
        res.json(result.types);
    } catch (err) {
        //console.error(err)
        res.send(err);
    }
    
});


app.get('/employees/:type', [auth.verify], async (req, res) => {

    let query = req.query;
    let type = req.params.type.charAt(0) + req.params.type.substring(1).toLowerCase();

    let db = await connect();

    let filter={
        type: type,
    };

    //fetch only by category and filter result in backend
    let cursor = await db.collection('users').find(filter);
    let results = await cursor.toArray();

    let values = []
    if (query._any ){
        let pretraga = query._any;
        values = pretraga.split(' ');

        let keys = ['fullName', 'address']; //add more later

        
        //source: https://stackoverflow.com/questions/68005153/search-by-multiple-keys-and-values-javascript
        let regex = new RegExp(values.join('|'), 'i')
        let output =  results.filter(e =>  keys.some(k => regex.test(e[k])) )

        res.json(output); 
    }

    else res.json(results);
});



app.post('/add_employee', async (req, res) => {
    let db = await connect();
    let user = req.body;
    delete user.id
    
    try {
        let result = await auth.registerUser(user);

        res.status(201).send(true);

    } catch (e) {
        res.status(500).json({
            error: e.message,
        });
    }
});


app.patch('/update_employee', async (req, res) => {
    let doc = req.body;
    let db = await connect();

    let id = doc.id;
    doc.username = doc.email
    delete doc.id;
    delete doc.email;


    //simpler than calling whole auth.changeUserPassword method and two db calls - but first dummy check if already hashed (means that password isnt changed during current update)
    if (!doc.password.includes('$2b$')) doc.password = await bcrypt.hash(doc.password, 8);
 
    let result = await db.collection('users').updateOne(
        { _id: mongo.ObjectId(id) },
        {
            $set: doc,
        }
    );

    if (result.modifiedCount == 1) {
        res.json({
            status: 'success',
            id: result.insertedId,
        });
    } else {
        res.status(500).json({
            status: 'fail',
        });
    }
});



app.delete('/employees/:id', async (req, res) => {
    let db = await connect();
    let id = req.params.id;

    let result = await db.collection('users').deleteOne(
        { _id: mongo.ObjectId(id) }

    );

    if (result.deletedCount == 1) {
        res.status(201).send();
    } else {
        res.status(500).json({
            status: 'fail',
        });
    }
});




app.get('/get_subscribers', [auth.verify], async (req, res) => {
    let db = await connect();

    try{
        let cursor = await db.collection('subscribers').find();
        let results = await cursor.toArray();
        
        res.json(results);

    } catch (err) {
        res.send(err);
    }
});



app.get('/get_feedbacks', [auth.verify], async (req, res) => {
    let db = await connect();

    try{
        let cursor = await db.collection('feedbacks').find();
        let results = await cursor.toArray();
        
        res.json(results);

    } catch (err) {
        res.send(err);
    }
});




app.get('/order_types', async (_req, res) => {
    let db = await connect();
    let result= undefined
    try{
        result = await db.collection('order_status').findOne()
        res.json(result.types);
    } catch (err) {
        //console.error(err)
        res.send(err);
    }
    
});




// ovaj search nisam osposobio da radi s kategorijama - radi problem kada nema search terma jer ne moze 'and' uvjet biti prazan i na subcategory='all' filtrira doslovno po "All" - drugi problem je sada rijesen
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
