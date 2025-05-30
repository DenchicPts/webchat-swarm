const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const redis = require('redis');
const fs = require('node:fs');
const path = require('node:path');


const redisClient = redis.createClient({
    url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`
});


redisClient.connect().then(() => {
    console.log("Connected to Redis");
}).catch(console.error);

const wss = new WebSocket.Server({ noServer: true });
const app = express();
app.use(express.static(__dirname + "/www"));
app.use(express.json());

wss.on('connection', (ws) => {
    console.log(`WS: client connected`);
    ws.on('close', () => {
        console.log(`WS: client disconnected`);
    });
});


function onConnectionUpgrade(req, socket, head) {
    if (req.url == '/ws') {
        wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit('connection', ws, req);
        });
    }
}

app.get("/", async (req, res) => {
    return res.send(await fs.readFileSync(path.join(__dirname, "/www/index/index.html"), "utf-8"));
});

app.post("/api/v1/message/send", async (req, res) => {
    if (!req.body.name) return res.status(400).json({ desc: "name is empty" });
    if (!req.body.content) return res.status(400).json({ desc: "content is empty" });

    const msg = {
        name: req.body.name,
        content: req.body.content,
        timestamp: Date.now()
    };

    await redisClient.rPush('messages', JSON.stringify(msg));

    wss.clients.forEach(client => {
        client.send(JSON.stringify({ message: msg, wsApiType: "message" }));
    });

    res.status(200).json({ desc: "OK" });
});

app.get("/api/v1/message/feed", async (req, res) => {
    let rawMessages = await redisClient.lRange('messages', 0, -1);
    let feed = rawMessages.map(m => JSON.parse(m));
    res.status(200).json({ feed });
});


async function init() {
    const server = http.createServer(app);
    server.listen(8989, () => {
        console.log(`Running on localhost:8989`);
        server.on('upgrade', onConnectionUpgrade);
    });
}
init();