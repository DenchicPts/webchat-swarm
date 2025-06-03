function initServerIp(){
    if (location.host){
        serverIp = location.host;
    }else{
        serverIp = "0.0.0.0"
    }
}
class wspc extends EventTarget{
    constructor(url,protocols,noconnect){
        super();
        if (location.protocol == 'https:' && !url.startsWith('wss')){
            this.url = 'wss'+url.slice(2);
        }else{
            this.url = url;
        }
        this.protocols = protocols;
        this.connected = false;
        this.savedRequests = [];
        this.handler = [];
        this.resendQueue = [];
        this.reconnectStep = 125;
        this.reconnectTimeout = null;
        this.showDebug = false;
        if (!noconnect) this.connect();
        this.once = false;
    }
    json(reqBody){
        if (this.showDebug) console.log(reqBody);
        this.socket.send(JSON.stringify(reqBody))
    }
    request(reqBody){
        if (this.showDebug) console.log(reqBody)
        let prom = new Promise((resolve,reject)=>{
            if (this.savedRequests.indexOf() == -1) {reqBody.rid = this.savedRequests.length;}
            else {reqBody.rid = this.savedRequests.indexOf()}
            this.socket.send(JSON.stringify(reqBody));
            this.savedRequests[reqBody.rid] = {resolve,body:reqBody,wsApiType:reqBody.wsApiType,timestamp:(new Date()).getTime()}
        })
        return prom;
    }
    handle(apiType,callback){
        if (!apiType) throw new Error("wpsc: apiType cannot be null!");
        if (!callback) throw new Error("wpsc: callback cannot be null!");
        this.handler.push({wsApiType:apiType,callback:callback});
    }
    connect(){
        if (this.showDebug) console.log(`wspc -> Connecting to ${this.url}...`);
        if (this.connected == true) return;
        this.socket = new WebSocket(this.url,this.protocols);
        this.socket.addEventListener('open',(e) =>{
            this.connected = true; 
            if (!this.once) {
                this.dispatchEvent(new Event('once'))
                this.once = true;
            }
            this.reconnectStep = 125; 
            this.dispatchEvent(new Event(e.type,e));
            if (this.reconnectTimeout) this.dispatchEvent(new Event('reconnected'));
            clearTimeout(this.reconnectTimeout);
            if (this.showDebug) console.log(`wspc -> Connected to websocket`)
        });
        this.socket.addEventListener('message',(e) =>{
            let data = {}
            try{
                data = JSON.parse(e.data);
            } catch(e){
                return this.dispatchEvent(new Event('parse_error',e));
            }
            if (this.savedRequests[data.rid]){
                this.savedRequests[data.rid].resolve(data);
                this.savedRequests[data.rid] = undefined;
                return;
            }
            for (let i =0; i<this.handler.length;i++){
                if (this.handler[i].wsApiType == data.wsApiType) return this.handler[i].callback(data);
            }
            this.dispatchEvent(new CustomEvent(e.type,{detail:{data}}))
        });
        this.socket.addEventListener('error',(e) =>{
            this.dispatchEvent(new Event(e.type,e));
        });
        this.socket.addEventListener('close',(e) =>{
            if (this.showDebug) console.log(`wspc -> Connection closed`);
            this.connected = false;
            this.reconnect();
            this.dispatchEvent(new Event(e.type,e))
        });
    }
    reconnect(){ //250 500 1000 2000 4000 8000
        if (this.reconnectStep < 8000) this.reconnectStep*=2;
        if (this.showDebug) console.log(`wspc -> Reconnecting after ${this.reconnectStep}ms...`);
        if (this.connected == false){
            this.reconnectTimeout = setTimeout(()=>{this.connect()},this.reconnectStep)
        }
    }
}
async function easyFetch(addr,notJson){
    if (notJson){
        return await fetch(addr).then(res =>{return res.text();}).then(data=>{return data});
    }
    try{
        return await fetch(addr).then(res =>{return res.json();}).then(data=>{return data});
    }catch(e){
        console.log(e);
        return false;
    }
}
async function fastPost(addr,body){
    if (typeof body == "object"){
        body = JSON.stringify(body);
    }
    return await fetch(addr,{
        method:"POST",
        body:body,
        headers:{
            "Content-Type":"application/json"
        }
    })
}