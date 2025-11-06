const express = require('express');
const cors = require('cors');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express()
const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

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

        // bids releted api
        app.get('/bids', async (req, res) => {
            const email = req.query.email;
            const query = {};
            if (email) {
                query.buyer_email = email;
            }

            const cursor = bidsCollection.find(query);
            const result = await cursor.toArray();
            res.send(result)
        })

        app.get('/Products/bids/:productId', async(req, res)=>{
            const productId = req.params.productId;
            const query = {
                product: productId
            }
            const cursor = bidsCollection.find(query).sort({bid_price: -1})
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get('/bits', async(req, res)=>{

            const query = {};
            if(query.email){
                query.buyer_email = email;
            }

            const cursor = bidsCollection.find(query);
            const result = await cursor.toArray();
            res.send(result)
        })

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