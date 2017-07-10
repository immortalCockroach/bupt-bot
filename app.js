// This loads the environment variables from the .env file
require('dotenv-extended').load();
var http = require("http");
var restify = require('restify');
var builder = require('botbuilder');
var requestData = require('./request');

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});

// Create connector and listen for messages
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
server.post('/api/messages', connector.listen());

var instructions = '你好！欢迎使用北京邮电大学BOT！:)';
var result;

var bot = new builder.UniversalBot(connector, function (session) {
    var query = session.message.text;
    session.send("收到你的问题: [%s]----正在分析......", query);
    
    var obj = {};
    obj["question"] = query;
    var postData = JSON.stringify(obj);
     
    var options = {
        hostname: '52.243.39.44',
        port: 5000,
        path: '/api/v1.0/maptask/post/',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };
         
    var req = http.request(options, (res) => {
        console.log(`STATUS: ${res.statusCode}`);
        console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
            data=JSON.parse(chunk);
            session.send(data['data']);
            console.log(`BODY: ${chunk}`);
        });
        res.on('end', () => {
            console.log('No more data in response.');
        });
    });
         
    req.on('error', (e) => {
        console.log(`problem with request: ${e.message}`);
    });
         
    // write data to request body
    req.write(postData);
    req.end();
});

bot.on('conversationUpdate', function (activity) {
    // when user joins conversation, send instructions
    if (activity.membersAdded) {
        activity.membersAdded.forEach(function (identity) {
            if (identity.id === activity.address.bot.id) {
                var reply = new builder.Message()
                    .address(activity.address)
                    .text(instructions);
                bot.send(reply);
            }
        });
    }
});
