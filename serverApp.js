const express = require('express');
const Sequelize = require('sequelize')
const http = require('http');
const WebSocket = require('ws');

const fs = require('node:fs');
const path = require('node:path');


const sequelize = new Sequelize('chattest','user','password',{
    host:"localhost",
    dialect:"sqlite",
    logging:false,
    storage:"database.sqlite"
});

const Message = sequelize.define('MESSAGE',{
    name:{
        type:Sequelize.STRING
    },
    content:{
        type:Sequelize.STRING
    }
},{ tableName: 'MESSAGE', timestamps: true });

const wss = new WebSocket.Server({noServer: true});
const app = express();
app.use(express.static(__dirname+"/www"));
app.use(express.json());


wss.on('connection', (ws) => {
    console.log(`WS: client connected`);
    ws.on('message', (data) => {

    });
    ws.on("close", () => {
        console.log(`WS: client disconnected`);
    });
});



function onConnectionUpgrade(req,socket,head){
    if (req.url == '/ws'){
        wss.handleUpgrade(req,socket,head,(ws)=>{
            wss.emit('connection',ws,req);
        })
    }
}

app.get("/",async (req,res)=>{
    return res.send(await fs.readFileSync(path.join(__dirname,"/www/index/index.html"),"utf-8"))
})

app.post("/api/v1/message/send",async (req,res)=>{
    if (!req.body.name) return res.status(400).json({desc:"name is empty"});
    if (!req.body.content) return res.status(400).json({desc:"content is empty"});


    console.log(req.body);
    let msg = Message.build({name:req.body.name,content:req.body.content});
    await msg.save();
    wss.clients.forEach(client=>{
        let obj = {message:msg,wsApiType:"message"};
        client.send(JSON.stringify(obj));
    })
    res.status(200).json({desc:"OK"});
})

app.get("/api/v1/message/feed", async (req,res)=>{
    let feed = await Message.findAll();
    res.status(200).json({feed});
})


async function init(){
    Message.sync();
    const server = http.createServer(app);
    server.listen("8989",()=>{
        console.log(`Running on localhost:8989`);
        server.on('upgrade',onConnectionUpgrade);
    })
}
init();