// This loads the environment variables from the .env file
require('dotenv-extended').load();
var http = require("http");

var builder = require('botbuilder');
var restify = require('restify');
var Store = require('./store');
var spellService = require('./spell-service');
var Connection = require('tedious').Connection;
var Request = require('tedious').Request;
var requestData = require('./request');

// Create connection to database
var config = {
  userName: 'alei', // update me
  password: 'Bupt@2017', // update messagee
  server: 'bupt-bot.database.windows.net', // update me
  options: {
      encrypt: true,
      database: 'bupt_bot',
      rowCollectionOnRequestCompletion:true
       //update me
  }
}

var connection = new Connection(config);

// Attempt to connect and execute queries if connection goes through
connection.on('connect', function(err) {
    if (err) {
        console.log(err)
    }
    // // 拉取数据库表头列表数据
    // var tableList = ['学院'];
    // for(var i in tableList){
    //     queryDatabase(tableList[i],"","",tableList[i]).then(function(datalist){
    //         console.log('列表：'+datalist);
    //         requestData(tableList[i],datalist);
    //     });
    // }
});




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

var instructions = 'Welcome to Bupt Question-answer Online Bot!Input \'Help\' for suggested questions format,hope that we can help you! ';

var bot = new builder.UniversalBot(connector, function (session) {

    var text = session.message.text.toLocaleLowerCase();
    session.send('Sorry, I did not understand \'%s\'. Type \'help\' if you need assistance.', session.message.text);
    


    // var reply = new builder.Message()
    //     .address(session.message.address);

    // var text = session.message.text.toLocaleLowerCase();
    
    // switch (text) {
    //     case 'show me a hero card':
    //         reply.text('Sample message with a HeroCard attachment')
    //             .addAttachment(new builder.HeroCard(session)
    //                 .title('Sample Hero Card')
    //                 .text('Displayed in the DirectLine client'));
    //         break;

    //     case 'send me a botframework image':
    //         reply.text('Sample message with an Image attachment')
    //             .addAttachment({
    //                 contentUrl: 'https://docs.microsoft.com/en-us/bot-framework/media/how-it-works/architecture-resize.png',
    //                 contentType: 'image/png',
    //                 name: 'BotFrameworkOverview.png'
    //             });

    //         break;

    //     default:
    //         reply.text('You said \'' + session.message.text + '\'');
    //         break;
    // }

    // session.send(reply);

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

// You can provide your own model by specifing the 'LUIS_MODEL_URL' environment variable
// This Url can be obtained by uploading or creating your model from the LUIS portal: https://www.luis.ai/
var recognizer = new builder.LuisRecognizer(process.env.LUIS_MODEL_URL);
bot.recognizer(recognizer);

//人物名称
bot.dialog('peopleName', [function (session, args,next) {
    session.send(' alei-bot正在分析你的问题  : \'%s\'', session.message.text+"......");
    // retrieve hotel name from matched entities
    var entityList = ['职位','实验室','学校','时间','项目','数字','等级','机构','学院','属性'];
    var entities = args.intent.entities;
    var intent = args.intent;
    console.log(entities);
    
    var academic = builder.EntityRecognizer.findEntity(args.intent.entities,'学院');
    var position = builder.EntityRecognizer.findEntity(args.intent.entities,'职位');
    var lab = builder.EntityRecognizer.findEntity(args.intent.entities,'实验室');
    var school = builder.EntityRecognizer.findEntity(args.intent.entities,'学校');
    var time = builder.EntityRecognizer.findEntity(args.intent.entities,'时间');
    var project = builder.EntityRecognizer.findEntity(args.intent.entities,'项目');
    var number =  builder.EntityRecognizer.findEntity(args.intent.entities,'数字');
    var level = builder.EntityRecognizer.findEntity(args.intent.entities,'等级');
    var fundation = builder.EntityRecognizer.findEntity(args.intent.entities,'机构');
    var prop = builder.EntityRecognizer.findEntity(args.intent.entities,'属性');

    var leastLevel = lab?lab:(academic?academic:school);
    console.log(leastLevel);

    // 最小单位+职位
    if(leastLevel && position){
        var name = leastLevel.type.replace(/\s+/g, "") || "";
        if(name!="学校"){
            var nameValue = (leastLevel.resolution?leastLevel.resolution.values[0]:leastLevel.entity).replace(/\s+/g, "") || "";
            var positionName = (position.resolution?position.resolution.values[0]:position.entity).replace(/\s+/g, "") || "";
            queryDatabase(name,name,nameValue,positionName).then(function(result){
                if(result){
                    next({response:result});
                }else{
                    next({response:'对不起，该信息官网还未透露~~'});
                }
            })
        }else{
            var nameValue = leastLevel.entity.replace(/\s+/g, "") || "";
            var positionName = position.entity.replace(/\s+/g, "") || "";
            queryDatabase(name,name,"北邮",positionName).then(function(result){
                if(result){
                    next({response:result});
                }else{
                    next({response:'对不起，该信息官网还未透露~~'});
                }
            })
        }
    
    }

},
function (session, results) {
    session.send(results.response);
}]).triggerAction({
    matches: '人物名称'
});

//成立时间
bot.dialog('startTime', [function (session, args,next) {
    session.send(' alei-bot正在分析你的问题: \'%s\'', session.message.text+"......");
    // retrieve hotel name from matched entities
    var entityList = ['实验室','学校','学院','属性'];
    var entities = args.intent.entities;
    var intent = args.intent;
    console.log(entities);
    
    var academic = builder.EntityRecognizer.findEntity(args.intent.entities,'学院');
    var lab = builder.EntityRecognizer.findEntity(args.intent.entities,'实验室');
    var school = builder.EntityRecognizer.findEntity(args.intent.entities,'学校');
    var prop = builder.EntityRecognizer.findEntity(args.intent.entities,'属性');

    var leastLevel = lab?lab:(academic?academic:school);
    console.log(leastLevel);

    // 最小单位+职位
    if(leastLevel){
        var name = leastLevel.type.replace(/\s+/g, "") || "";
        var nameValue = (leastLevel.resolution?leastLevel.resolution.values[0]:leastLevel.entity).replace(/\s+/g, "") || "";
        var startTime = "成立时间";
        if(name!="学校"){
            queryDatabase(name,name,nameValue,startTime).then(function(result){
                if(result){
                    next({response:result});
                }else{
                    next({response:'对不起，该信息官网还未透露~~'});
                }
            })
        }else{
            queryDatabase(name,name,"北邮",startTime).then(function(result){
                if(result){
                    next({response:result});
                }else{
                    next({response:'对不起，该信息官网还未透露~~'});
                }
            })
        }
    }

},
function (session, results) {
    session.send(''+results.response);
}]).triggerAction({
    matches: '成立时间'
});

//简介
bot.dialog('introduction', [function (session, args,next) {
    session.send(' alei-bot正在分析你的问题: \'%s\'', session.message.text+"......");
    // retrieve hotel name from matched entities
    var entityList = ['实验室','学校','学院','项目','机构','属性'];
    var entities = args.intent.entities;
    var intent = args.intent;
    console.log(entities);
    
    var academic = builder.EntityRecognizer.findEntity(args.intent.entities,'学院');
    var lab = builder.EntityRecognizer.findEntity(args.intent.entities,'实验室');
    var school = builder.EntityRecognizer.findEntity(args.intent.entities,'学校');
    var prop = builder.EntityRecognizer.findEntity(args.intent.entities,'属性');
    var project = builder.EntityRecognizer.findEntity(args.intent.entities,'项目');
    var fundation = builder.EntityRecognizer.findEntity(args.intent.entities,'机构');
    var center = builder.EntityRecognizer.findEntity(args.intent.entities,'中心');


    var leastLevel = center?center:(lab?lab:(academic?academic:school));
    console.log(leastLevel);

    // 最小单位
    if(leastLevel){
        var name = leastLevel.type.replace(/\s+/g, "") || "";
        var nameValue = (leastLevel.resolution?leastLevel.resolution.values[0]:leastLevel.entity).replace(/\s+/g, "") || "";
        var intro = "简介";
        if(name!="学校"){
            queryDatabase(name,name,nameValue,intro).then(function(result){
                if(result){
                    next({response:result});
                }else{
                    next({response:'对不起，该信息官网还未透露~~'});
                }
            })
        }else{
            queryDatabase(name,name,"北邮",intro).then(function(result){
                if(result){
                    next({response:result});
                }else{
                    next({response:'对不起，该信息官网还未透露~~'});
                }
            })
        }
        
    }

},function (session, results) {
    session.send(results.response);
}]).triggerAction({
    matches: '简介'
});

//网址
bot.dialog('website', [function (session, args,next) {
    session.send(' alei-bot正在分析你的问题: \'%s\'', session.message.text+"......");
    // retrieve hotel name from matched entities
    var entityList = ['学校','学院'];
    var entities = args.intent.entities;
    var intent = args.intent;
    console.log(entities);
    
    var academic = builder.EntityRecognizer.findEntity(args.intent.entities,'学院');
    var school = builder.EntityRecognizer.findEntity(args.intent.entities,'学校');
    var lab = builder.EntityRecognizer.findEntity(args.intent.entities,'实验室');

    var leastLevel = lab?lab:(academic?academic:school);
    console.log(leastLevel);

    // 最小单位
    if(leastLevel){
        var name = leastLevel.type.replace(/\s+/g, "") || "";
        var nameValue = (leastLevel.resolution?leastLevel.resolution.values[0]:leastLevel.entity).replace(/\s+/g, "") || "";
        var website = "网址";

        if (name!="学校") {
            queryDatabase(name,name,nameValue,website).then(function(result){
                if(result){
                    next({response:result});
                }else{
                    next({response:'对不起，该信息官网还未透露~~'});
                }
            })
        }else{
            queryDatabase(name,name,"北邮",website).then(function(result){
                if(result){
                    next({response:result});
                }else{
                    next({response:'对不起，该信息官网还未透露~~'});
                }
            })
        }
        
    }

},function (session, results) {
    session.send(''+results);
}]).triggerAction({
    matches: '网址'
});

//电话号码
bot.dialog('phone', [function (session, args,next) {
    session.send(' alei-bot正在分析你的问题: \'%s\'', session.message.text+"......");
    // retrieve hotel name from matched entities
    var entityList = ['学校','学院','实验室','机构','职位','属性'];
    var entities = args.intent.entities;
    var intent = args.intent;
    console.log(entities);
    
    var academic = builder.EntityRecognizer.findEntity(args.intent.entities,'学院');
    var school = builder.EntityRecognizer.findEntity(args.intent.entities,'学校');
    var lab = builder.EntityRecognizer.findEntity(args.intent.entities,'实验室');
    var prop = builder.EntityRecognizer.findEntity(args.intent.entities,'属性');
    var fundation = builder.EntityRecognizer.findEntity(args.intent.entities,'机构');
    var position = builder.EntityRecognizer.findEntity(args.intent.entities,'职位');

    var leastLevel = position?position:(fundation?fundation:(lab?lab:(academic?academic:school)));
    console.log(leastLevel);

    // 最小单位
    if(leastLevel){
        var name = leastLevel.type.replace(/\s+/g, "") || "";
        var nameValue = (leastLevel.resolution?leastLevel.resolution.values[0]:leastLevel.entity).replace(/\s+/g, "") || "";
        var phone = "联系电话";
        if(name!="学校"){
            queryDatabase(name,name,nameValue,phone).then(function(result){
                if(result){
                    next({response:result});
                }else{
                    next({response:'对不起，该信息官网还未透露~~'});
                }
            })
        }else{
            queryDatabase(name,name,"北邮",phone).then(function(result){
               if(result){
                    next({response:result});
                }else{
                    next({response:'对不起，该信息官网还未透露~~'});
                }
            })
        }
    
    }

},function (session, results) {
    session.send(''+results.response);
}]).triggerAction({
    matches: '电话号码'
});

//教师人数
bot.dialog('teacherNum', [function (session, args,next) {
    session.send(' alei-bot正在分析你的问题: \'%s\'', session.message.text+"......");
    // retrieve hotel name from matched entities
    var entityList = ['中心','实体','职称','导师','人才名称','学院'];
    var entities = args.intent.entities;
    var intent = args.intent;
    console.log(entities);
    
    // var center = builder.EntityRecognizer.findEntity(args.intent.entities,'中心');
    // var item = builder.EntityRecognizer.findEntity(args.intent.entities,'实体');
    // var position = builder.EntityRecognizer.findEntity(args.intent.entities,'职称');
    // var teacher = builder.EntityRecognizer.findEntity(args.intent.entities,'导师');
    // var genious = builder.EntityRecognizer.findEntity(args.intent.entities,'人才名称');
    var academic = builder.EntityRecognizer.findEntity(args.intent.entities,'学院');


    // var leastLevel = center?center:(item?item:(position?position:(teacher?teacher:(genious?genious:null))));
    // console.log(leastLevel);

    if(academic){
        var name = "学院";
        var prop1 = (academic.resolution?academic.resolution.values[0]:academic.entity).replace(/\s+/g, "") || "";
        for(var i in entities){
            if(entities[i].type!="学院"){
               var prop2= entities[i].entity.replace(/\s+/g, "").replace(/多少/g,"")+"人数" || "";
               break;           
            }
        }
        
        queryDatabase(name,name,prop1,prop2).then(function(result){
            if(result){
                    next({response:result});
                }else{
                    next({response:'对不起，该信息官网还未透露~~'});
            }
        })
        
        
    }

},function (session, results) {
    session.send(''+results.response);
}]).triggerAction({
    matches: '教师人数'
});

//列表  没处理。。。
bot.dialog('list', [function (session, args,next) {
    session.send(' alei-bot正在分析你的问题: \'%s\'', session.message.text+"......");
    // retrieve hotel name from matched entities
    var entityList = ['实验室','学校','学院','项目','机构','属性'];
    var entities = args.intent.entities;
    var intent = args.intent;
    console.log(entities);
    
    var academic = builder.EntityRecognizer.findEntity(args.intent.entities,'学院');
    var lab = builder.EntityRecognizer.findEntity(args.intent.entities,'实验室');
    var school = builder.EntityRecognizer.findEntity(args.intent.entities,'学校');
    var prop = builder.EntityRecognizer.findEntity(args.intent.entities,'属性');
    var project = builder.EntityRecognizer.findEntity(args.intent.entities,'项目');
    var fundation = builder.EntityRecognizer.findEntity(args.intent.entities,'机构');


    var leastLevel = lab?lab:(academic?academic:school);
    console.log(leastLevel);

    // 最小单位
    if(leastLevel){
        var name = leastLevel.type.replace(/\s+/g, "") || "";
        var nameValue = (leastLevel.resolution?leastLevel.resolution.values[0]:leastLevel.entity).replace(/\s+/g, "") || "";
        var intro = "简介";
        if(name!="学校"){
            queryDatabase(name,name,nameValue,intro).then(function(result){
                if(result){
                    next({response:result});
                }else{
                    next({response:'对不起，该信息官网还未透露~~'});
                }
            })
        }else{
            queryDatabase(name,name,"北邮",intro).then(function(result){
                if(result){
                    next({response:result});
                }else{
                    next({response:'对不起，该信息官网还未透露~~'});
                }
            })
        }
        
    }

},function (session, results) {
    session.send(results.response);
}]).triggerAction({
    matches: '列表'
});

//办公室
bot.dialog('workplace', [function (session, args,next) {
    session.send(' alei-bot正在分析你的问题: \'%s\'', session.message.text+"......");
    // retrieve hotel name from matched entities
    var entityList = ['实验室','学校','学院','项目','机构','属性'];
    var entities = args.intent.entities;
    var intent = args.intent;
    console.log(entities);
    
    var academic = builder.EntityRecognizer.findEntity(args.intent.entities,'学院');
    var lab = builder.EntityRecognizer.findEntity(args.intent.entities,'实验室');
    var school = builder.EntityRecognizer.findEntity(args.intent.entities,'学校');
    var prop = builder.EntityRecognizer.findEntity(args.intent.entities,'属性');
    var project = builder.EntityRecognizer.findEntity(args.intent.entities,'项目');
    var fundation = builder.EntityRecognizer.findEntity(args.intent.entities,'机构');


    var leastLevel = lab?lab:(academic?academic:school);
    console.log(leastLevel);

    // 最小单位
    if(leastLevel){
        var name = leastLevel.type.replace(/\s+/g, "") || "";
        var nameValue = (leastLevel.resolution?leastLevel.resolution.values[0]:leastLevel.entity).replace(/\s+/g, "") || "";
        var prop = "办公室";
        if(name!="学校"){
            queryDatabase(name,name,nameValue,prop).then(function(result){
                if(result){
                    next({response:result});
                }else{
                    next({response:'对不起，该信息官网还未透露~~'});
                }
            })
        }else{
            queryDatabase(name,name,"北邮",prop).then(function(result){
                if(result){
                    next({response:result});
                }else{
                    next({response:'对不起，该信息官网还未透露~~'});
                }
            })
        }
        
    }

},function (session, results) {
    session.send(results.response);
}]).triggerAction({
    matches: '办公室'
});

//地址
bot.dialog('address', [function (session, args,next) {
    session.send(' alei-bot正在分析你的问题: \'%s\'', session.message.text+"......");
    // retrieve hotel name from matched entities
    console.log('address');
    var entityList = ['实验室','学校','学院','项目','机构','属性'];
    var entities = args.intent.entities;
    var intent = args.intent;
    console.log(entities);
    
    var academic = builder.EntityRecognizer.findEntity(args.intent.entities,'学院');
    var lab = builder.EntityRecognizer.findEntity(args.intent.entities,'实验室');
    var school = builder.EntityRecognizer.findEntity(args.intent.entities,'学校');
    var prop = builder.EntityRecognizer.findEntity(args.intent.entities,'属性');
    var project = builder.EntityRecognizer.findEntity(args.intent.entities,'项目');
    var fundation = builder.EntityRecognizer.findEntity(args.intent.entities,'机构');


    var leastLevel = lab?lab:(academic?academic:school);
    console.log(leastLevel);

    // 最小单位
    if(leastLevel){
        var name = leastLevel.type.replace(/\s+/g, "") || "";
        var nameValue = (leastLevel.resolution?leastLevel.resolution.values[0]:leastLevel.entity).replace(/\s+/g, "") || "";
        var intro = "简介";
        if(name!="学校"){
            queryDatabase(name,name,nameValue,intro).then(function(result){
                if(result){
                    next({response:result});
                }else{
                    next({response:'对不起，该信息官网还未透露~~'});
                }
            })
        }else{
            queryDatabase(name,name,"北邮",intro).then(function(result){
                if(result){
                    next({response:result});
                }else{
                    next({response:'对不起，该信息官网还未透露~~'});
                }
            })
        }
        
    }

},function (session, results) {
    session.send(results.response);
}]).triggerAction({
    matches: '地址'
});

//数量统计
bot.dialog('numberCollect', [function (session, args,next) {
    session.send(' alei-bot正在分析你的问题: \'%s\'', session.message.text+"......");
    // retrieve hotel name from matched entities
    var entityList = ['实验室','学校','学院','项目','机构','属性'];
    var entities = args.intent.entities;
    var intent = args.intent;
    console.log(entities);
    
    var academic = builder.EntityRecognizer.findEntity(args.intent.entities,'学院');
    var lab = builder.EntityRecognizer.findEntity(args.intent.entities,'实验室');
    var school = builder.EntityRecognizer.findEntity(args.intent.entities,'学校');
    var prop = builder.EntityRecognizer.findEntity(args.intent.entities,'属性');
    var project = builder.EntityRecognizer.findEntity(args.intent.entities,'项目');
    var fundation = builder.EntityRecognizer.findEntity(args.intent.entities,'机构');
    var number = builder.EntityRecognizer.findEntity(args.intent.entities,'数字');


    var leastLevel = lab?lab:(academic?academic:school);
    console.log(leastLevel);

    // 最小单位
    if(leastLevel){
        var name = leastLevel.type.replace(/\s+/g, "") || "";
        var nameValue = (leastLevel.resolution?leastLevel.resolution.values[0]:leastLevel.entity).replace(/\s+/g, "") || "";
        var num = number.entity.replace(/\s+/g, "") || "";
        if(name!="学校"){
            queryDatabase(name,name,nameValue,num).then(function(result){
                if(result){
                    next({response:result});
                }else{
                    next({response:'对不起，该信息官网还未透露~~'});
                }
            })
        }else{
            queryDatabase(name,name,"北邮",num).then(function(result){
                if(result){
                    next({response:result});
                }else{
                    next({response:'对不起，该信息官网还未透露~~'});
                }
            })
        }
        
    }

},function (session, results) {
    session.send(''+results.response);
}]).triggerAction({
    matches: '数量统计'
});

//时间查询   没有搞。。。
bot.dialog('timeSearch', [function (session, args,next) {
    session.send(' alei-bot正在分析你的问题: \'%s\'', session.message.text+"......");
    // retrieve hotel name from matched entities
    var entityList = ['实验室','学校','学院','项目','机构','属性'];
    var entities = args.intent.entities;
    var intent = args.intent;
    console.log(entities);
    
    var academic = builder.EntityRecognizer.findEntity(args.intent.entities,'学院');
    var lab = builder.EntityRecognizer.findEntity(args.intent.entities,'实验室');
    var school = builder.EntityRecognizer.findEntity(args.intent.entities,'学校');
    var prop = builder.EntityRecognizer.findEntity(args.intent.entities,'属性');
    var project = builder.EntityRecognizer.findEntity(args.intent.entities,'项目');
    var fundation = builder.EntityRecognizer.findEntity(args.intent.entities,'机构');


    var leastLevel = lab?lab:(academic?academic:school);
    console.log(leastLevel);

    // 最小单位
    if(leastLevel){
        var name = leastLevel.type.replace(/\s+/g, "") || "";
        var nameValue = (leastLevel.resolution?leastLevel.resolution.values[0]:leastLevel.entity).replace(/\s+/g, "") || "";
        var intro = "简介";
        if(name!="学校"){
            queryDatabase(name,name,nameValue,intro).then(function(result){
                if(result){
                    next({response:result});
                }else{
                    next({response:'对不起，该信息官网还未透露~~'});
                }
            })
        }else{
            queryDatabase(name,name,"北邮",intro).then(function(result){
                if(result){
                    next({response:result});
                }else{
                    next({response:'对不起，该信息官网还未透露~~'});
                }
            })
        }
        
    }

},function (session, results) {
    session.send(results.response);
}]).triggerAction({
    matches: '时间查询'
});

//研究方向
bot.dialog('research', [function (session, args,next) {
    session.send(' alei-bot正在分析你的问题: \'%s\'', session.message.text+"......");
    // retrieve hotel name from matched entities
    var entityList = ['实验室','学校','学院','项目','机构','属性'];
    var entities = args.intent.entities;
    var intent = args.intent;
    console.log(entities);
    
    
    var lab = builder.EntityRecognizer.findEntity(args.intent.entities,'实验室');
    var center = builder.EntityRecognizer.findEntity(args.intent.entities,'中心');
    var teacher = builder.EntityRecognizer.findEntity(args.intent.entities,'人名');

    var leastLevel = teacher?teacher:(lab?lab:center);
    console.log(leastLevel);

    // 最小单位
    if(leastLevel){
        var name = leastLevel.type.replace(/\s+/g, "") || "";
        var nameValue = (leastLevel.resolution?leastLevel.resolution.values[0]:leastLevel.entity).replace(/\s+/g, "") || "";
        if (name == "中心") {
            var way = "研究领域";
        }else{
            var way = "研究方向";
        }
        
        if(name =="人名"){
            queryDatabase("老师","老师",nameValue,way).then(function(result){
                if(result){
                    next({response:result});
                }else{
                    next({response:'对不起，该信息官网还未透露~~'});
                }
            })
        }
        
    }

},function (session, results) {
    session.send(results.response);
}]).triggerAction({
    matches: '研究方向'
});

//筹建时间 没搞。。。
bot.dialog('prebuiltTime', [function (session, args,next) {
    session.send(' alei-bot正在分析你的问题: \'%s\'', session.message.text+"......");
    // retrieve hotel name from matched entities
    var entityList = ['实验室','学校','学院','项目','机构','属性'];
    var entities = args.intent.entities;
    var intent = args.intent;
    console.log(entities);
    
    var academic = builder.EntityRecognizer.findEntity(args.intent.entities,'学院');
    var lab = builder.EntityRecognizer.findEntity(args.intent.entities,'实验室');
    var school = builder.EntityRecognizer.findEntity(args.intent.entities,'学校');
    var prop = builder.EntityRecognizer.findEntity(args.intent.entities,'属性');
    var project = builder.EntityRecognizer.findEntity(args.intent.entities,'项目');
    var fundation = builder.EntityRecognizer.findEntity(args.intent.entities,'机构');


    var leastLevel = lab?lab:(academic?academic:school);
    console.log(leastLevel);

    // 最小单位
    if(leastLevel){
        var name = leastLevel.type.replace(/\s+/g, "") || "";
        var nameValue = (leastLevel.resolution?leastLevel.resolution.values[0]:leastLevel.entity).replace(/\s+/g, "") || "";
        var intro = "简介";
        if(name!="学校"){
            queryDatabase(name,name,nameValue,intro).then(function(result){
                if(result){
                    next({response:result});
                }else{
                    next({response:'对不起，该信息官网还未透露~~'});
                }
            })
        }else{
            queryDatabase(name,name,"北邮",intro).then(function(result){
                if(result){
                    next({response:result});
                }else{
                    next({response:'对不起，该信息官网还未透露~~'});
                }
            })
        }
        
    }

},function (session, results) {
    session.send(results.response);
}]).triggerAction({
    matches: '筹建时间'
});

//邮箱地址
bot.dialog('email', [function (session, args,next) {
    session.send(' alei-bot正在分析你的问题: \'%s\'', session.message.text+"......");
    // retrieve hotel name from matched entities
    var entityList = ['实验室','学校','学院','项目','机构','属性'];
    var entities = args.intent.entities;
    var intent = args.intent;
    console.log(entities);
    
    var academic = builder.EntityRecognizer.findEntity(args.intent.entities,'学院');
    var lab = builder.EntityRecognizer.findEntity(args.intent.entities,'实验室');
    var school = builder.EntityRecognizer.findEntity(args.intent.entities,'学校');
    var prop = builder.EntityRecognizer.findEntity(args.intent.entities,'属性');
    var project = builder.EntityRecognizer.findEntity(args.intent.entities,'项目');
    var fundation = builder.EntityRecognizer.findEntity(args.intent.entities,'机构');


    var leastLevel = lab?lab:(academic?academic:school);
    console.log(leastLevel);

    // 最小单位
    if(leastLevel){
        var name = leastLevel.type.replace(/\s+/g, "") || "";
        var nameValue = (leastLevel.resolution?leastLevel.resolution.values[0]:leastLevel.entity).replace(/\s+/g, "") || "";
        var intro = "邮箱";
        if(name!="学校"){
            queryDatabase(name,name,nameValue,intro).then(function(result){
                if(result){
                    next({response:result});
                }else{
                    next({response:'对不起，该信息官网还未透露~~'});
                }
            })
        }else{
            queryDatabase(name,name,"北邮",intro).then(function(result){
                if(result){
                    next({response:result});
                }else{
                    next({response:'对不起，该信息官网还未透露~~'});
                }
            })
        }
        
    }

},function (session, results) {
    session.send(results.response);
}]).triggerAction({
    matches: '邮箱地址'
});

//学校信息
bot.dialog('schoolinfo', [function (session, args,next) {
    session.send(' alei-bot正在分析你的问题: \'%s\'', session.message.text+"......");
    // retrieve hotel name from matched entities
    var entityList = ['实验室','学校','学院','项目','机构','属性'];
    var entities = args.intent.entities;
    var intent = args.intent;
    console.log(entities);
    
    var school = builder.EntityRecognizer.findEntity(args.intent.entities,'学校');
    var info = builder.EntityRecognizer.findEntity(args.intent.entities,'学校属性');


    var name = "学校";
    var prop2 = info.entity.replace(/\s+/g,"").replace(/多少/g, "").replace(/数/g,"").replace(/学校/g,"").replace(/高校/g,"")|| "";
    console.log(prop2);
    var intro = "简介";
    
    queryDatabase(name,name,"北邮",prop2).then(function(result){
        if(result== 1){
            next({response:'答案：肯定啊'});
        }else if (result == 0) {
            next({response:'答案：还不是，555555'});
        }else{
            next({response:'答案：'+result});
        }
    })

},function (session, results) {
    session.send(''+results.response);
}]).triggerAction({
    matches: '学校信息'
});


// Spell Check
if (process.env.IS_SPELL_CORRECTION_ENABLED === 'true') {
    bot.use({
        botbuilder: function (session, next) {
            spellService
                .getCorrectedText(session.message.text)
                .then(function (text) {
                    session.message.text = text;
                    next();
                })
                .catch(function (error) {
                    console.error(error);
                    next();
                });
        }
    });
}

//Database Query
function queryDatabase(table,key,prop1,prop2){
    return new Promise(function(resolve,reject){
        var request = null;
        if(table&&key&&prop1&&prop2){
            request = new Request(
                "select ["+prop2+"] from [dbo]."+table+" where ["+key+"]=N'"+prop1+"'",
                function(err, rowCount, rows) {
                    console.log(err);
                    // console.log("rows:"+rows);
                }
            );


            request.on('row', function(columns) {
                columns.forEach(function(column) {
                    // console.log("%s\t%s", column.metadata.colName, column.value);   
                    resolve(column.value);
                });
            });
        }else if (key==""&&prop1=="") {   //查询所有表的第一列
            console.log("get in!");
            request = new Request(
                "select ["+prop2+"] from [dbo]."+table,
                function(err, rowCount, rows) {
                    console.log(err);
                    // console.log("rows:"+rows);
                }
            );
            var listArr = [];

            request.on('row', function(columns) {
                columns.forEach(function(column) {
                    // console.log("%s\t%s", column.metadata.colName, column.value);
                    listArr.push(column.value);
                    console.log(column.value);
                });
            });

            setTimeout(function(){
                resolve(listArr);
            },1000);
            
        }
        // Read all rows from table
        

        connection.execSql(request);
    })

}
