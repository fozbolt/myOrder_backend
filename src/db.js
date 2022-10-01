import mongo from 'mongodb';

let connection_string = 'mongodb+srv://admin:admin@cluster0.fp8vr.mongodb.net/?retryWrites=true&w=majority';

let client = new mongo.MongoClient(connection_string, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

let db = null;

// We esport Promise which resolves on connection
export default () => {
    return new Promise((resolve, reject) => {
        // if we initialized database and client is still connected
        if (db && client.isConnected()) {
            resolve(db);
        } else {
            client.connect((err) => {
                if (err) {
                    reject('Spajanje na bazu nije uspjelo:' + err);
                } else {
                    console.log('Database connected successfully!');
                    db = client.db('myOrder');
                    resolve(db);
                }
            });
        }
    });
};
