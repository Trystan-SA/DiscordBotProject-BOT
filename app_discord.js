require('dotenv').config()
const express = require('express')
const app = express();
const bodyParser = require('body-parser')
const schedule = require('node-schedule');
const { ShardingManager } = require('discord.js');
const manager = new ShardingManager('./DiscordBot/discordbot.js', { token: process.env.BOT_TOKEN });
const DebugColor = require('./API/Console');



manager.spawn();



//MIDDLEWARE//
var jsonParser = bodyParser.json()



//ROUTES//
app.post('/RefreshGuild', jsonParser , function(req, res){
    if(req.headers.authorizationpassapi == process.env.APIAUTHKEY){
        if(req.body.GuildID){
            manager.shards.forEach(function(elem){
            elem.manager.broadcastEval(`this.emit('refreshguild', '${req.body.GuildID}');`);
            });
            res.status(200).end();
        }
    }

    function RejectAPI(response){
        response.status(500).end();
    }
})


app.get('/GatherGuildInfo', function(req, res){
    if(req.query.ApiOauth == process.env.APIAUTHKEY){
        if(req.query.Guildid != 'undefined'){
            manager.shards.forEach(function(elem){
                elem.manager.broadcastEval(`this.guilds.get('${req.query.Guildid}')`)
                .then(function(foundguild){
                    if(foundguild[0] != undefined){

                        elem.manager.broadcastEval(`this.guilds.get('${req.query.Guildid}').memberCount`)
                        .then(function(membercount){

                            elem.manager.broadcastEval(`this.guilds.get('${req.query.Guildid}').GatherChannels()`)
                            .then(function(channels){

                                elem.manager.broadcastEval(`this.guilds.get('${req.query.Guildid}').GatherRoles()`)
                                .then(function(roles){
                                  

                                    var Result = {
                                        "MemberCount" : membercount[0],
                                        "Channels" : channels[0],
                                        "Roles" : roles[0]
                                    }

                                    res.status(200).send(Result);
                                })
                                .catch(function(err){console.error(err); res.status(500).end(err, 'utf8');})
                            })
                            .catch(function(err){console.error(err); res.status(500).end(err, 'utf8');})
                        })
                        .catch(function(err){console.error(err); res.status(500).end(err, 'utf8');})
                    }
                    else {res.status(500).end("Guild Not found inside the bot Collection", 'utf8');}
                })
                .catch(function(err){console.error(err); res.status(500).end(err, 'utf8');})
            })
        }
    }
})



app.get('/PremiumVerification', function(req, res){
    if(req.query.ApiOauth === process.env.APIAUTHKEY){
        manager.shards.forEach(function(elem){
            elem.manager.broadcastEval(`this.emit('premiumverification', '');`)
            .then(function(result){
                res.status(200).end();
            })
        })
    }
})


//Triggered when the Website ask for the Analytics of an Owner//
app.get('/analytics', function(req ,res){
    manager.shards.forEach(function(elem){
        elem.manager.broadcastEval(`this.emit('analyticgathering', '')`);
    });
    res.status(200).end();
})

// ----- ANALYTICS DAILY RETRIEVE ------ ///

//TRIGGER THE ANALYTICS GATHERING EVERY DAY AT THAT TIME//
var rule = new schedule.RecurrenceRule();
rule.hour = 22;
rule.minute = 00;
rule.second = 00;
schedule.scheduleJob(rule, function(){
    manager.shards.forEach(function(elem){
        elem.manager.broadcastEval(`this.emit('analyticgathering', ''`);
    });
});



app.post('/Feedback/NewTicket', function(request, response){
    console.log(request.body)
})



app.listen(3131, function(){
    console.info('[LOG] BOT READY || PORT : 3131');
})
