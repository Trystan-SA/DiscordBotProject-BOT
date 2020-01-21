const DiscordBot = require('../discordbot');
const mysql = require('../Mysql');


const main = {

    Configuration: {
        name : "InternalBehavior",
        CanBeDeactivated : 'false',
    },

    //Configured command//
    Commands: {
        newguild : {
            name: "new guild",
            description:"CreateNew Guild test",
            aliases: ['ng', 'newguild'],
            usage: '[command name]',
            guildOnly: true,
            cooldown: 5,
            permission: "Everyone",
            execute: "TestingEvent",
        },

        premium : {
            name: "premium",
            description: "...",
            aliases:['prem', 'premium'],
            usage: '[Command Name]',
            guildOnly: true,
            cooldown:5,
            permission: "Admin",
            execute: "DisplayPremiumRight"
        }
    },


    event: {
        "guildCreate" : "GuildCreation"
    },

    TestingEvent(message){
        console.log("???")
        var DiscordBot = require('../discordbot.js');
        DiscordBot.EventOccurs("guildCreate", message.guild)
        .then(function(resolve){
        })

        //The plugin is not activated or not valid...
        .catch(function(err){
        });
    },


    DisplayPremiumRight(message){
        var DiscordBot = require('../discordbot');
        DiscordBot.Return_Stored_GuildsList(message.guild.id, "PremiumInfo")
        .then(function(result){
            message.reply("GUILDID = " + message.guild.id + " || Premium = " + result.get("PremiumPass"));
        })
    },



    //Triggered When the bot join a server
    //Initialize Mysql data, set memory info and everything needed so the bot can work properly//
    GuildCreation(guild){
        console.notice("New Guild Joined - " + guild.id + " - " + guild.name);

        //Re-init the variable of Roles and Channels in case the website want them//
        var Guildidlist = [guild];
        DiscordBot.FillGuildsList(Guildidlist)
        

        //First, check if the guildtable already exist inside the DB//
        mysql.Is_GuildExist(guild) 
        .then(function(result){ 

            console.notice("Guild don't exist in DB");
            //If the guildDB table doesn't exist, create a new one.
            mysql.Add_Guild(guild)
            .then(function(result){
                
                //console.notice('New guild table created');
            })
            .catch(function(err){console.critical(err);})

            console.log("??")
            mysql.Create_NewAnalyticsTable(guild.id)
            .then(function(result){console.log(result);})
            .catch(function(err){console.log(err);})  

            //Then create a new configuration row for the current guild//
            mysql.CreateNewConfigGuildEntry(guild)
            .then(function(result){})
            .catch(function(err){console.error(err)})

            main.FetchAllGuildMember_IntoDB(guild)
            .then(function(result){})
            .catch(function(err){console.error(err)})
        })
       
        //The table already exist, retrieve members inside the bot memory//
        .catch(function(err){ 
            console.notice("Guild already exist ?");
            main.FetchAllGuildMember_IntoDB(guild)
            .then(function(result){})
            .catch(function(err){console.error(err)})
        })
    },


    //Fetch all the guild members of the desired guild and add them to the database if they doesn't exist yet/:
    FetchAllGuildMember_IntoDB(guild){
        return new Promise((resolve, reject)=>{

            mysql_discord.CheckIfGuildTableExist(guild) //First, check if the guildtable already exist inside the DB//
            .then(function(result){
                reject("ERROR - Tried to FetchAllGuildMember_IntoDB but the DB returned not existed");
            })
            .catch(function(err){
                guild.fetchMembers('', 99999)
                .then(query =>{
                    query.members.forEach((item) => {
                        mysql_discord.AddUserToGuild(guild, item.user)
                        .then(function(resolve){})
                        .catch(function(err){console.error(err);})
                    })
                 
                })
                .catch(err =>{reject(err);})
            })

        })
    }
}


module.exports.main = main;