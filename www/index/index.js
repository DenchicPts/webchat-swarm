//Заменить на домен/адрес в интернете
// ws://zevordex.ru/ws
//Если есть сертификат: wss://zevordex.ru/ws
const rws = new wspc("ws://localhost:8989/ws");
rws.showDebug = true;

const feedRef = document.querySelector('.feed');
const sendNameRef = document.getElementById('send-name');
const sendContentRef = document.getElementById('send-content');

document.getElementById('send-submit').addEventListener('click',async ev=>{
    let name = sendNameRef.value;
    let content = sendContentRef.value;

    if (!name || !content) return alert("Данные пусты!");

    await fastPost("/api/v1/message/send",{name,content});
    sendContentRef.value = "";
})

document.addEventListener('DOMContentLoaded',async ev=>{
    rws.addEventListener('message',(data)=>{
        let wsObj = data.detail.data;
        if (wsObj.wsApiType == "message"){
            addMessageToFeed(wsObj.message)
        }
    })
    let data = await easyFetch("/api/v1/message/feed");
    console.log("feed",data);
    reloadFeed(data.feed);
})


function reloadFeed(feed){
    let str = ``;
    feed.forEach(msg=>{
        str+=msgJSX(msg);
    })
    feedRef.innerHTML = str;
}
function msgJSX(msg){
    return `<msg><b>${msg.name}</b>:<p>${msg.content}</p></msg>`;
}

function addMessageToFeed(msg){
    feedRef.insertAdjacentHTML('beforeend',msgJSX(msg));
}