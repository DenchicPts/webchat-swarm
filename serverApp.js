const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const redis = require('redis');
const fs = require('node:fs');
const path = require('node:path');


const redisClient = redis.createClient({
    url: `redis://${process.env.REDIS_HOST || 'redis'}:${process.env.REDIS_PORT || 6379}`
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
    const { name, content } = req.body;
    if (!name) return res.status(400).json({ desc: "name is empty" });
    if (!content) return res.status(400).json({ desc: "content is empty" });

    const message = {
        name,
        content,
        timestamp: Date.now()
    };

    await redisClient.lPush("chat:messages", JSON.stringify(message));

    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ message, wsApiType: "message" }));
        }
    });

    res.status(200).json({ desc: "OK" });
});

app.get("/api/v1/message/feed", async (req, res) => {
    let rawMessages = await redisClient.lRange('chat:messages', 0, -1);
    let feed = rawMessages.map(m => JSON.parse(m)).reverse(); 
    res.status(200).json({ feed });
});


async function init() {
    const server = http.createServer(app);
    server.listen(8989, '0.0.0.0', () => {
        console.log(`Running on 0.0.0.0:8989`);
        server.on('upgrade', onConnectionUpgrade);
    });
}
init();