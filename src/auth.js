import mongo from 'mongodb';
import connect from './db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Creation of index on app run (if it doesnt exist yet)
(async () => {
    let db = await connect();
    db.collection('users').createIndex({ username: 1 }, { unique: true });
})();

export default {
    async registerUser(userData) {
        let db = await connect();
        let result;
        try {
            let doc = {
                username: userData.email,
                password: userData.password,
                fullName: userData.fullName,
                dateOfBirth: userData.dateOfBirth,
                phone: userData.phone,
                address: userData.address,
                city: userData.city,
                postalCode: userData.postalCode,
                contract: userData.contract,
                wage: userData.wage,
                type: userData.employeeType,
                password: userData.password,
                url: userData.url,
                password: await bcrypt.hash(userData.password, 8),  // password hashing through bcrypt
            };
            
            result = await db.collection('users').insertOne(doc);
        } catch (e) {
            if (e.name == 'MongoError') {
                if (e.code == 11000) {
                    throw new Error('Username already exists');
                }
            }
        }

        if (result && result.insertedCount == 1) {
            return result.insertedId;
        } else {
            throw new Error('Cannot register user');
        }
    },

    async authenticateUser(username, password) {
        let db = await connect();
        let user = await db.collection('users').findOne({ username: username });
        if (user && user.password && (await bcrypt.compare(password, user.password))) {
       
            delete user.password; // ne želimo u tokenu, token se sprema na klijentu
            let token = jwt.sign(user, process.env.JWT_SECRET, {
                algorithm: 'HS512',
                expiresIn: '1 week',
            });
     
            return {
                token,
                username: user.username,
                type: user.type,
                id: user._id
            };
        } else {
            throw new Error('Cannot authenticate');
        }
    },
    async changeUserPassword(username, old_password, new_password) {
        let db = await connect();
        let user = await db.collection('users').findOne({ username: username });

        if (user && user.password && (await bcrypt.compare(old_password, user.password))) {
            let new_password_hashed = await bcrypt.hash(new_password, 8);

            let result = await db.collection('users').updateOne(
                { _id: user._id },
                {
                    $set: {
                        password: new_password_hashed,
                    },
                }
            );
            return result.modifiedCount == 1;
        }
    },
    // express.js middleware function
    verify(req, res, next) {
        if (req.headers['authorization']) {
            try {
                let authorization = req.headers['authorization'].split(' ');
                if (authorization[0] !== 'Bearer') {
                    return res.status(401).send(); // HTTP invalid requets
                } else {
                    let token = authorization[1];
                    // save jwt in request, verify throws error(exception) if it doesn't succeed
                    req.jwt = jwt.verify(authorization[1], process.env.JWT_SECRET);
                    return next();
                }
            } catch (err) {
                return res.status(401).send(); // HTTP not-authorized
            }
        } else {
            return res.status(401).send(); // HTTP invalid request
        }
    },
};
