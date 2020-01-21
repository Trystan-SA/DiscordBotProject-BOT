require('dotenv').config();
const mysql = require('./Mysql');
const fs = require('fs');
const NodeCache = require("node-cache");
const Cache = new NodeCache({stdTTL : 360, checkperiod: 60});
const Discord = require('discord.js');
const bot = new Discord.Client();
const fetch = require('node-fetch');
const PremiumVerif = require('./PremiumVerification');
const DebugColor = require('../API/Console');


//--- MEMORY STORAGE ---//
bot.PluginsList = new Discord.Collection(); //Get all the plugins of the bot//
bot.GuildsList = new Discord.Collection(); //A map of every guild of that shard//
bot.Analytics = new Discord.Collection(); //List of analytic memory stored data//



//--- Function used by plugins to retrieve the memory storage ---//
async function Return_Stored_PluginsList(){
    return new Promise((resolve, reject)=>{
        resolve(bot.PluginsList);
    }) 
}
module.exports.Return_Stored_PluginsList = Return_Stored_PluginsList

async function Return_Stored_GuildsList(GuildID, Plugin){
    return new Promise((resolve, reject)=>{ 
        var Guild = bot.GuildsList.get(GuildID);
        if(Guild){
            if(Plugin){var Data = Guild[Plugin];}
            else { var Data = Guild;}
            if(Data){resolve(Data);}
            else {reject("I'm sorry, but no Configuration plugin matched your Discord server. Please contact an administrator :(");}
        }
        else {reject("I'm sorry, but no Configuration file matched your Discord server. Please contact an administrator :(");}
    })
}
module.exports.Return_Stored_GuildsList = Return_Stored_GuildsList;



//Fill up Plugins List//
fs.readdir("./DiscordBot/Plugins/", 'utf8', function(err, file){
    if(err){console.error(err)}
    else if(file){
        file.forEach(function(pluginFile){
            var IncludedPlugin = require('./Plugins/' + pluginFile);
            IncludedPlugin = IncludedPlugin.main;
            var PluginName = pluginFile.slice(0, pluginFile.length - 3);

            bot.PluginsList.set(PluginName, IncludedPlugin);
        })
    }
})


//Will iterate through every guilds ID the bot is in charge of. 
//And will retrieve the plugins configuration of every entries from the DB
//Will then store them inside the bot.GuildsList var
async function FillGuildsList(guildslist){
    console.time("FillGuildsList");
    var GuildIDList = []
    guildslist.forEach(function(Guild, Index){
        GuildIDList.push(Guild.id);
        
        Guild.GatherRoles = function(){
            var rolemap = new Discord.Collection();
            this.roles.forEach(roleElem => {
                if(roleElem.managed == false){
                    var RolemapContent = {
                        "id" : roleElem.id,
                        "name" : roleElem.name,
                        "color" : roleElem.color,
                        "position" : roleElem.position,
                        "permissions" : roleElem.permissions,
                        "mentionable" : roleElem.mentionable,
                    
                    } 
                    rolemap.set(roleElem.id , RolemapContent);
                }
            });
            return rolemap.array();
        }

        Guild.GatherChannels = function(){
            var channelsmap = new Discord.Collection();
            this.channels.forEach(ChanElem => {
                var ChannelsMapContent = {
                    "type" : ChanElem.type,
                    "id" : ChanElem.id,
                    "name" : ChanElem.name,
                    "position" : ChanElem.position,
                    "permissions" : ChanElem.permissions,
                    "parentID" : ChanElem.parentID,
                    "topic" : ChanElem.topic,
                    "nsfw" : ChanElem.nsfw,
                } 
                channelsmap.set(ChanElem.id , ChannelsMapContent);
            });
            return channelsmap.array();
        }
    })

    mysql.Get_GuildPluginData(GuildIDList)
    .then(function(resolve){
        resolve.forEach(function(element, i){
            if(element){
                Object.keys(element).forEach(function(pluginelem, index){
                    var NewMap = new Map;
                    
                    Object.values(element)[index].forEach(function(entryelem){
                        NewMap.set(entryelem[0], entryelem[1]);
                    })
                    resolve.get(i)[pluginelem] = NewMap
                })
            }
            //TO CALL THIS : console.log(resolve.get(i)['InternalBehavior'].get('Prefix'));
        })
        bot.GuildsList = resolve;
        console.timeEnd("FillGuildsList");
    })
}
module.exports.FillGuildsList = FillGuildsList;

//CUSTOM EVENT
async function NotifyGuildOwner(GuildID, message){
    var guild = bot.guilds.get(GuildID);
    message = message   .replace(/{guildname}/g, guild.name)
                        .replace(/{membercount}/g, guild.memberCount)
                        .replace(/{pricinglink}/g, "http://localhost:8080/pricing")
                        .replace(/{emailcontact}/g, "support@quested.io");
    if(guild){
        guild.owner.send(message);
    }
} 
module.exports.NotifyGuildOwner = NotifyGuildOwner;






/// ---------------------------------- ///
/// ---- DISCORD EVENT DISPATCHER ---- ///
/// ---------------------------------- ///

//CUSTOM EVENT
bot.on('premiumverification', param => {
    PremiumVerif.PremiumVerification(bot);
}); 



//Will get the analytics of the current day//
bot.on('analyticgathering', nullparam => {
    bot.guilds.forEach(function(guild){
        dis_mysql.Push_AnalyticsData_membercount(guild.id, guild.memberCount);
    })
});



//CUSTOM EVENT
//Triggered when a Owner modified his Dashboard configuration//
//The bot will search for the data inside his memory if it can find the guild//
//If found, retrieve the new data from the Database//

bot.on('refreshguild', GuildID => {
    PremiumVerif.SinglePremiumVerificiation(bot, GuildID)
    .then(function(result){
        RefreshGuild(GuildID);
    })
    .catch(function(err){console.error(err)})
})

async function RefreshGuild(GuildID){
    return new Promise((resolve, reject)=>{
        var RefreshingGuild = bot.GuildsList.get(GuildID);
        //Check if the guild is present inside that shard//
        if(RefreshingGuild){
            var GuildIDList = [GuildID]
            mysql.Get_GuildPluginData(GuildIDList)
            .then(function(resolve){
                resolve.forEach(function(element, i){          
                    Object.keys(element).forEach(function(pluginelem, index){
                        var NewMap = new Map;
                        Object.values(element)[index].forEach(function(entryelem){
                            NewMap.set(entryelem[0], entryelem[1]);
                        })
                        resolve.get(i)[pluginelem] = NewMap
                    })
                })
                bot.GuildsList.delete(GuildID);
                bot.GuildsList.set(GuildID, resolve.get(GuildID));
            })
        }
    })
}
module.exports.RefreshGuild = RefreshGuild;

bot.on('ready', () => {
    console.info(`[LOG] BOT STARTED || Shard ID = ${bot.shard.id} || Process ID = ${process.pid}`);
    FillGuildsList(bot.guilds);
});



//Triggered when a new user joined a server//
bot.on('guildMemberAdd', member => {
    EventOccurs("guildMemberAdd", member);
});



//Triggered when the bot join a server//
bot.on('guildCreate', guild => {
    EventOccurs("guildCreate", guild);
}); 



bot.on('message', message => {
    console.time("Message CMD");
    //-- The message is sent from a guild channel --// 
    if(message.channel.type === 'text'){ 

        console.log("1")

        //--- INITIALIZATION PREFIX ---//
        var Prefix = "!";
        if(bot.GuildsList.get(message.guild.id)){


            bot.GuildsList.get(message.guild.id)['InternalBehavior'].forEach(function(elem){
                if(Object.values(elem)[0] === "Prefix"){
                    Prefix = (Object.values(elem)[1]);
                    if(Prefix.length < 1){
                        Prefix = "!";
                    }
                }
            })

            console.log("2")

            if(message.content.startsWith(Prefix)){ //Check if prefix is present//     
                var MessageSplited = message.content.slice(Prefix.length, message.content.length).split(" ");

                console.log("3")
                bot.PluginsList.forEach(function(PluginElem){ //Foreach plugins//    
                    Object.values(PluginElem.Commands).forEach(function(CMD){ //For each commands//
                        if(CMD.guildOnly === true){
                            if(CMD.aliases != null){
                                for(i=0; i < CMD.aliases.length; i++){
                                    if(CMD.aliases[i] === MessageSplited[0]){
                                        MessageSplited.shift();
                                        ExecuteCMD(PluginElem ,CMD, MessageSplited, message, true)
                                        return true;
                                    }
                                }
                            }
                            else { // TODO : ERROR REPORT : Private REPORT --> For invalid or empty Aliases for that specific command //
                            }
                        }
                        else {
                            ErrorReport(`The command "${CMD.name}" is DM only. Write this command here instead :)`, "Private", message);
                            return false; 
                        }
                    })
                })
            }
        }
        bot.emit('guildCreate', message.guild);
    }

    //-- The message is sent from a DM directly to the bot --//
    else { 
        if(message.content.startsWith('!')){
            message.content = message.content.slice(1, message.content.length);
            console.log("DM");
        }
    }
    console.timeEnd("Message CMD");
})



//CMD = The command retrived from the Stored in memory variable of Bot.PluginsList
//Args = The splitted message without the prefix and the command name//
//message = reference to the Discord.event.On('message')//

async function ExecuteCMD(Plugin, CMD, Args, message, IsPublic){ 

    return new Promise((resolve, reject)=>{
        var PermissionPass = false;
        if(CMD.permission === "Admin"){if(message.author.id === "106034269914144768"){PermissionPass = true;}}
        else if(CMD.permission === "Owner"){if(message.author.id === message.guild.ownerID || message.author.id === "106034269914144768"){PermissionPass = true;}}
        else if(CMD.permission === "" || CMD.permission === "Everyone"){PermissionPass = true;}


        if(PermissionPass === true){
            //Get if a cooldown is apply for that user for a specific command//
            Cache.get(message.author.id + "-" + CMD.name, function(err, value){
                if(err){console.error(err);}
                
                else if (value){
                    if(IsPublic === true){
                        message.reply(`Slowdown ! You need to wait ${CMD.cooldown} seconds before doing this command twice.`)
                        .then(msg =>{msg.delete(10000);}) 
                    }
                    else if(IsPublic === false){
                        message.send(`Slowdown ! You need to wait ${CMD.cooldown} seconds before doing this command twice.`)
                        .then(msg =>{msg.delete(10000);})
                    }
                }
                else if (!value){
                    Cache.set(message.author.id + "-" + CMD.name, "Cooldown", CMD.cooldown, function(err, success){
                        if(err){//TODO Error report private saying something went wrong with storing data to the cache. Maybe not enough memory or someone trying to get the bot down// 
                        }

                        else if (success){ //We can continue with the command verification//
                            var Exec = Plugin[CMD.execute];
                            Exec(message);
                        }
                    })
                }
            })
        }
    })
}


//The type can be : Private (only the user see the message in DM)
//                  Public (The message is draw in the channel)
//                  Report (The message is concidered critical and will be displayed in the logs as important).
//                  PrivateReport (The message is concidered critical, but keep the reason private for the user).
async function ErrorReport(MSG, Type, message){
    return new Promise((resolve, reject)=>{
        if(Type === "Private"){
            message.author.send(MSG)
            .then(msg =>{
                msg.delete(100000);
            })
        }

        else if (Type === "Public"){
            message.reply(MSG)
            .then(msg=>{
                msg.delete(10000)
            })
        }

        else if (Type === "Report"){
            //TODO : Make the Report
        }

        else if (Type === "PrivateReport"){
            //TODO : Make the Report
        }

    })
}


bot.login(process.env.BOT_TOKEN)







/// ---------------------------------- ///
/// ---------- GLOBAL EVENT ---------- ///
/// ---------------------------------- ///

//Global events are used by plugins to trigger specifics components.
//Or when two plugins need to communicate together.

async function EventOccurs(EventName, Args){
    return new Promise((resolve, reject)=>{
        bot.PluginsList.forEach(function(elem){
            if(elem.event != undefined){
                Object.keys(elem.event).forEach(function(keyelem, index){
                    if(keyelem === EventName){
                        var Execution = elem[Object.values(elem.event)[index]];

                        //Here, the importance is to retrive the guild ID 
                        //of every events that require to process if the guild have activated this or that plugin.
                        var GuildID= "";

                        if(EventName.startsWith("guild")){
                            if(Args.guild){GuildID = Args.guild.id;}
                            else if (Args.id){GuildID = Args.id;}
                        }

                        //Got of not the guild id ? 
                        //If yes, do the pluginconfigurationvalidation, if not, continue without doing it (the command is propably inside DM).
                        if(GuildID !== ""){      
                            CheckifPluginConfigValid(GuildID, elem)
                            .then(function(res){ 
                                Execution(Args);
                                resolve(true);
                            })
                            .catch(function(err){console.error(err);})
                        }
                        else { 
                            Execution(Args);
                            resolve(true);
                        }
                            //reject("[ERROR] Discordbot.js - EventOccurs || GuildID is empty : Need it to check if Plugin config valid");
                    }
                })
            }
        })
    })
}
module.exports.EventOccurs = EventOccurs;



//Check if the pluginconfiguration is valid for that particular guild//
//For example, it will check if that guild have activated that specific plugin or not//
//Or it will verify, if the command invocked is for non-limited server only, if the guild is in the free plan or if the guild is premium//
async function CheckifPluginConfigValid(GuildID, PluginElem){
    return new Promise((resolve, reject)=>{


        //TODO - Check if the plugin is for premium server only. If yes, check if the current guild have subscribed to a plan. 
        //Need to wait until I made the premium system before doing that// 
        /*if(PluginElem.Configuration.IsPremium === true){
            console.log("Plugin is for premium only");
        }
        else {
            console.log("Plugin is NOT for premium only");
        }*/


        //TODO - Check if the plugin is limited to only valid plans (free or premium). If yes, check if the current guild is inside a free plan (under 100 users) or if the guild is premium//
        //Need to wait until I made athe premium system before doing that//


        if(PluginElem.Configuration.CanBeDeactivated == 'true'){
            var IsActivated;
            IsActivated = bot.GuildsList.get(GuildID)[PluginElem.Configuration.name].get("Activated");
            if(IsActivated === "true" || IsActivated === true){ resolve(true);}
            else {reject("Plugin not activated");}

        } 
        resolve(true);
    })
}


//When a discordmessage have {PARAM} in it (like {user} or {user-online}
//Process that and display real ouput.
async function Draw_MSG_Param(MSG, message, member){
    return new Promise((resolve, reject)=>{

        if(message){
            MSG = MSG   .replace(/{user}/g, message.member.displayName)
                        .replace(/{user.tag}/g, message.author.tag)
                        .replace(/{user.avatar}/g, message.author.avatarURL)
                        .replace(/{@user}/g, message.author)
                        .replace(/{server}/g, message.member.guild.name)
                        .replace(/{membercount}/g, message.member.guild.memberCount)
                        .replace(/{@everyone}/g, "@everyone")
                        .replace(/{@here}/g, "@here")
                        .replace(/\\n/g, "\n");
            
            MSG = AtChannelAndRoles(MSG, message.member.guild);
        }
        else if(member){
            MSG = MSG   .replace(/{user}/g, member.displayName)
                        .replace(/{user.tag}/g, member.user.tag)
                        .replace(/{user.avatar}/g, member.user.avatarURL)
                        .replace(/{@user}/g, member.user)
                        .replace(/{server}/g, member.guild.name)
                        .replace(/{membercount}/g, member.guild.memberCount)
                        .replace(/{@everyone}/g, "@everyone")
                        .replace(/{@here}/g, "@here")
                        .replace(/\\n/g, "\n");

            MSG = AtChannelAndRoles(MSG, member.guild);
        }
        resolve(MSG);
    })


    function AtChannelAndRoles(message, guild){
        var msg = message;
        var regex = /(?<=\{@)(.*?)(?=\})/g; 
        var MatchArray = msg.match(regex);

        if(MatchArray != null){
            MatchArray.forEach(function(elem, index){
                if(elem !== "user" || elem !== "everyone" || elem !== "here"){
                    //Check if the regex match is equal a role inside the server//
                    var FoundRole = false;
                    guild.roles.forEach(function(roleelem){
                        if(roleelem.name === elem){
                            FoundRole = true;
                            var regexMatchElem = "{@" + elem + "}";
                            msg = msg.replace(regexMatchElem, roleelem);
                        }
                    })
                    //If no role found for that regex match. Check if a channel of this server match it instead//
                    if(FoundRole === false){
                        guild.channels.forEach(function(channelelem){
                            if(channelelem.name === elem){
                                var regexMatchElem = "{@" + elem + "}"; 
                                msg = msg.replace(regexMatchElem, channelelem);
                            }
                        })
                    }
                }
            })
        }
        return msg;
    }
}
module.exports.Draw_MSG_Param = Draw_MSG_Param;