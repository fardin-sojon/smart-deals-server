const express = require('express');
const cors = require('cors');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const admin = require("firebase-admin");
const port = process.env.PORT || 3000;

// Firebse
const serviceAccount = require("./smart-deals-firebase-adminsdk-key.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


// middleware
app.use(cors());
app.use(express.json());

const logger = (req, res, next) => {
    console.log("loggin information")
    next();
}

const verifyFirebaseToken = async (req, res, next) => {
    console.log('in the verify middleware', req.headers.authorization);
    if (!req.headers.authorization) {
        // do not allow to go
        return res.status(401).send({ message: 'unauthorized access' })
    }
    const token = req.headers.authorization.split(' ')[1];
    if (!token) {
        return res.status(401).send({ message: 'unauthorized access' })
    }

    try {
        const userInfo = await admin.auth().verifyIdToken(token)
        req.token_email = userInfo.email;
        console.log('after token validation', userInfo);
        next()
    }
    catch {
        return res.status(401).send({ message: 'unauthorized access' })
    }

    // Verify Token

}

const verifyJWTToken = (req, res, next) => {
    // console.log("in middle ware", req.headers)
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    const token = authorization.split(' ')[1];
    if (!token) {
        return res.status(401).send({ message: 'unauthorized access' })
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'unauthorized access' })
        }
        // put it in the right place
        console.log("after decoded", decoded);
        req.token_email = decoded.email
        next();
    })

}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@simple-crud-mongodb-pra.v6jm7nb.mongodb.net/?appName=simple-crud-mongodb-practice`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

app.get('/', (req, res) => {
    res.send("Smart server is Running")
})

async function run() {
    try {
        await client.connect();


        const db = client.db("smart_db");
        const productsCollection = db.collection('products');
        const bidsCollection = db.collection('bids');
        const usersCollection = db.collection('users');

        // jwt related Api
        app.post('/getToken', (req, res) => {
            const loggedUser = req.body;
            const token = jwt.sign(loggedUser, process.env.JWT_SECRET, { expiresIn: '1h' })
            res.send({ token: token })
        })

        // User API
        app.post('/users', async (req, res) => {
            const newUser = req.body;

            const email = req.body.email;
            const query = { email: email }
            const existingUser = await usersCollection.findOne(query);
            if (existingUser) {
                res.send({ message: 'User Already Exits. do not need to insert again' })
            }
            else {
                const result = await usersCollection.insertOne(newUser);
                res.send(result)
            }
        })

        // Product API
        app.get('/products', async (req, res) => {
            // const projectFields = { title: 1, price_min:1, price_max: 1, image: 1}
            // const cursor = productsCollection.find().sort({price_min: 1}).skip(6).limit(2).project(projectFields);
            const email = req.query.email;
            const query = {}
            if (email) {
                query.email = email;
            }

            const cursor = productsCollection.find(query);
            const result = await cursor.toArray();
            res.send(result)
        })

        app.get('/latest-products', async (req, res) => {
            const cursor = productsCollection.find().sort({ created_at: -1 }).limit(8);
            const result = await cursor.toArray();
            res.send(result)
        })

        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = ObjectId.isValid(id)
                ? { _id: new ObjectId(id) }
                : { _id: id };
            const result = await productsCollection.findOne(query);
            res.send(result)
        })

        app.post('/products', async (req, res) => {
            const newProduct = req.body;
            const result = await productsCollection.insertOne(newProduct)
            res.send(result);
        })

        app.patch('/products/:id', async (req, res) => {
            const id = req.params.id;
            const updatedProduct = req.body;
            const query = { _id: new ObjectId(id) }
            const update = {
                $set: {
                    name: updatedProduct.name,
                    price: updatedProduct.price
                }
            }
            const result = await productsCollection.updateOne(query, update);
            res.send(result)
        })

        app.delete('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = ObjectId.isValid(id)
                ? { _id: new ObjectId(id) }
                : { _id: id };
            const result = await productsCollection.deleteOne(query);
            res.send(result);
        })

        app.get('/bids', verifyJWTToken, async (req, res) => {
            // console.log('headers', req.headers);
            const email = req.query.email;
            const query = {};
            if (email) {
                query.buyer_email = email
            }

            // verify user have access to see this data
            if(email !== req.token_email){
                return res.status(403).send({message: 'forbidden access'})
            }

            const cursor = bidsCollection.find(query)
            const result = await cursor.toArray();
            res.send(result);
        })

        // bids releted api with firebase token verify
        // app.get('/bids', logger, verifyFirebaseToken, async (req, res) => {
        //     console.log('headers', req)
        //     const email = req.query.email;
        //     const query = {};
        //     if (email) {
        //         if(email !== req.token_email){
        //             return res.status(403).send({message: 'forbidden access'})
        //         }
        //         query.buyer_email = email;
        //     }

        //     const cursor = bidsCollection.find(query);
        //     const result = await cursor.toArray();
        //     res.send(result)
        // })

        app.get('/Products/bids/:productId', verifyFirebaseToken, async (req, res) => {
            const productId = req.params.productId;
            const query = {
                product: productId
            }
            const cursor = bidsCollection.find(query).sort({ bid_price: -1 })
            const result = await cursor.toArray();
            res.send(result);
        })

        // app.get('/bits', async(req, res)=>{
        //     console.log('headers', req.headers)
        //     const query = {};
        //     if(query.email){
        //         query.buyer_email = email;
        //     }

        //     const cursor = bidsCollection.find(query);
        //     const result = await cursor.toArray();
        //     res.send(result)
        // })

        app.post('/bids', async (req, res) => {
            const newBid = req.body;
            const result = await bidsCollection.insertOne(newBid);
            res.send(result);
        })

        app.get('/bids/:id', async (req, res) => {
            const id = req.params.id;
            const query = ObjectId.isValid(id)
                ? { _id: new ObjectId(id) }
                : { _id: id };
            const result = await bidsCollection.findOne(query);
            res.send(result);
        })


        app.delete('/bids/:id', async (req, res) => {
            const id = req.params.id;
            const query = ObjectId.isValid(id)
                ? { _id: new ObjectId(id) }
                : { _id: id };
            const result = await bidsCollection.deleteOne(query);
            res.send(result);
        })


        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    }
    finally {

    }
}
run().catch(console.dir)

app.listen(port, () => {
    console.log(`Smart Server is running On Porst: ${port}`);
})



// Different Upai
// client.connect()
//     .then(() => {
//         app.listen(port, () => {
//             console.log(`Smart Server is running Now On Port: ${port}`);
//         })
//     })
//     .catch(console.dir)