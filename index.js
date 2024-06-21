const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT || 5000;


// middleware
app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nfgpaoq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const userCollection = client.db("alterwhiteDB").collection("users");
        const queryCollection = client.db("alterwhiteDB").collection("queries");
        const recommendationCollection = client.db("alterwhiteDB").collection("recommendations");


        // jwt related api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token });
        })


        // middlewares 
        const verifyToken = (req, res, next) => {
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'Unauthorized Access' });
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'Unauthorized Access' })
                }
                req.decoded = decoded;
                next();
            })
        }

        // user related api
        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const isUserExist = await userCollection.findOne(query);
            if (isUserExist) {
                return res.send({ message: 'Existing User', insertedId: null })
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        });

        // query related api
        app.get('/queries', async (req, res) => {
            const filter = req.query;
            // console.log(filter);
            const query = {
                productName: { $regex: filter.search, $options: 'i' }
            };
            const cursor = queryCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);

            // const result = await queryCollection.find().sort({ date: -1 }).toArray();
            // res.send(result);
        })
        app.get('/queries/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const query = { userEmail: email }
            const result = await queryCollection.find(query).sort({ date: -1 }).toArray();
            // console.log(result);
            res.send(result);
        })
        app.get('/queries/details/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await queryCollection.findOne(query)
            res.send(result);
        })
        app.post('/queries', verifyToken, async (req, res) => {
            const data = req.body;
            const result = await queryCollection.insertOne(data);
            res.send(result);
        })
        app.put('/queries/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $inc: { recommendationCount: 1 }
            }
            const result = await queryCollection.updateOne(filter, updateDoc)
            res.send(result);
        })
        app.put('/queries/decrement/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $inc: { recommendationCount: -1 }
            }
            const result = await queryCollection.updateOne(filter, updateDoc)
            res.send(result);
        })
        app.patch('/queries/update/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const data = req.body;
            // console.log(data);
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    productName: data.productName,
                    productBrand: data.productBrand,
                    productImage: data.productImage,
                    productTitle: data.productTitle,
                    productROA: data.productROA
                }
            }
            const result = await queryCollection.updateOne(filter, updateDoc)
            res.send(result);
        })
        app.delete('/queries/delete/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await queryCollection.deleteOne(query);
            res.send(result);
        })

        // recommendation related api
        app.get('/recommendations/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { queryId: id }
            const result = await recommendationCollection.find(query).toArray();
            res.send(result);
        })
        app.get('/recommendations/my/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const query = { recommenderEmail: email };
            const result = await recommendationCollection.find(query).toArray();
            res.send(result);
        })
        app.get('/recommendations/for-me/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const query = { queryUserEmail: email };
            const result = await recommendationCollection.find(query).toArray();
            res.send(result);
        })
        app.post('/recommendations', verifyToken, async (req, res) => {
            const data = req.body;
            const result = await recommendationCollection.insertOne(data)
            res.send(result);
        })
        app.delete('/recommendations/delete/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await recommendationCollection.deleteOne(query);
            res.send(result);
        })


        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('alterwite is running')
})

app.listen(port, () => {
    console.log(`alterwite is running  on port ${port}`);
})