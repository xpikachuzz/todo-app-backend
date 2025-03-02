const cors = require("cors");
const express = require("express");
const helmet = require("helmet");


const app = express();

// redis
const redis = require("redis");
const redisClient = require("./redis");
const { Server } = require("socket.io");
const { sessionMiddleWare, wrap } = require("./controllers/serverController");
const { initialize, emitComments } = require("./controllers/socketControllers");



// Set up CORS
app.use(cors({
    credentials: true,
    origin: "http://localhost:3000"
}));

// Set json for getting data from request body
app.use(express.json());

// Redis setup:
redisClient.on("error", (error) => console.error(`Error : ${error}`));


// this is saying we are `creatingServer`
// and any request which is http is passed into our app Express
const server = require("http").createServer(app);

// 1st arg is what our socketIO will be hosted on
// 2nd arg has cors
const io = new Server(server, {
    cors: { credentials: true,
        origin: "http://localhost:3000" },
});

redisClient.connect().catch(console.error)

// security check middleware
app.use(helmet());
app.use(sessionMiddleWare)
app.set('trust proxy', true)

// 📌 Endpoint to leave a comment
app.post("/comment", async (req, res) => {
    const { comment } = req.body;

    // get the ip
    const response = await fetch("https://api64.ipify.org?format=json");
    const data2 = await response.json();

    const userIP = req.headers["x-forwarded-for"] || req.socket.remoteAddress; // Get user IP
    // console.log("USER IP: ", `comment:${userIP}`)
    if (!comment) {
        return res.status(400).json({ message: "Comment cannot be empty!" });
    }

    // Check if the user has already commented
    const existingComment = await redisClient.get(`comment:${userIP}`);
    
    if (existingComment) {
        await redisClient.set(`comment:${userIP}`, comment);
        return res.status(200).json({ userIP, ok: true, message: "Someone has already commented under your IP! I have updated the comment" });
    }

    // Store the comment with user IP as key
    await redisClient.set(`comment:${userIP}`, comment);

    res.status(200).json({ userIP, ok: true, message: "Comment added successfully!" });

    // emit comment  by io
});

app.get("/comment", async (req, res) => {
    // Get the keys
    const keys = await redisClient.keys("comment:*")
    keys.forEach(async (key) => await redisClient.get(key))
    
    // comments get
    res.status(200).json({
        comments: await keys.map(async (key) => await redisClient.get(key))
    })
})


// Socket setup:
// w/ this layout first it sets up the shared cookies, then...
io.use(wrap(sessionMiddleWare))


// then runs the server.j
io.on("connect", (socket) => {
    initialize(io)

    socket.on("emit_comment", 
        (comment, cb) => emitComments(socket, comment, cb)
    )
});







// Start server
const port = 5000;

// Listen on port
server.listen(port, () => {
    console.log(`Running at - http://localhost:${port}`);
});
