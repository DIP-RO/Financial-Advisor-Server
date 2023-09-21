const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const jwt = require("jsonwebtoken");
const app = express();
const port = 5000;
var cors = require("cors");
const { query } = require("express");
require("dotenv").config();
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://ABC123456:ABC123456@cluster0.4k6cglw.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "Unathorized aaaaaAccess" });
  }
  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Hala CHor" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    const serviceCollection = client.db("AI-FINANCIAL-ADVISOR").collection("Service");
     const usersCollection = client.db("AI-FINANCIAL-ADVISOR").collection("users");
     const teamCollection = client.db("AI-FINANCIAL-ADVISOR").collection("team");
     const advisorCollection = client.db("AI-FINANCIAL-ADVISOR").collection("advisor");

    // verify admin
    const verifyAdmin = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "admin") {
        res.status(403).send({ message: "Forbiddn Access" });
      }
      next();
    };

    //   stripe Api
    app.post("/create-payment-intent", async (req, res) => {
      const booking = req.body;
      // console.log('api hit',req.headers)
      const price = booking.price;
      const amount = price * 100;

      const paymentIntent = await stripe.paymentIntents.create({
        currency: "usd",
        amount: amount,

        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    //  ------------User Api -----------

    app.put("/user/:email", async (req, res) => {
      try {
        const email = req.params.email;

        // check the req

        const user = req.body;
        const filter = { email: email };
        const options = { upsert: true };
        const updateDoc = {
          $set: user,
        };
        const result = await usersCollection.updateOne(
          filter,
          updateDoc,
          options
        );

        // token generate
        const token = jwt.sign(
          { email: email },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: "1d" }
        );
        res.send({
          status: "success",
          message: "Token Created Successfully",
          data: token,
        });
      } catch (err) {
        console.log(err);
      }
    });

    app.get("/user", verifyJWT, verifyAdmin, async (req, res) => {
      const query = {};
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    // ------ Admin API =--------
    app.put("/user/admin/:id", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);
      if (user?.role === "admin") {
        res.status(403).send({ message: "Forbiddn Access" });
      }

      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const option = { upsert: true };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc, option);
      res.send(result);
    });

    // Verify Admin email
    app.get("/user/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isAdmin: user?.role === "admin" });
    });

   
    app.get("/services", async (req, res) => {
      const query = {};
      const cursor = serviceCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    app.get("/team", async (req, res) => {
      const query = {};
      const cursor = teamCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    app.get("/advisor", async (req, res) => {
      const query = {};
      const cursor = advisorCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await serviceCollection.findOne(query);
      res.send(result);
    });
    app.post("/services", async (req, res) => {
      const body = req.body;
      const result = await serviceCollection.insertOne(body);
      res.send(result);
    });
    //------------ Admin API's--------------

    // create room
    app.post("/service", verifyJWT, verifyAdmin, async (req, res) => {
      const room = req.body;

      const result = await serviceCollection.insertOne(room);

      res.send(result);
    });

   
    

   
  } finally {
  }
}

run().catch((error) => console.log(error));

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
