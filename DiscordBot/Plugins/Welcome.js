const mysql_discord = require('../Mysql');


const main = {

    Configuration: {
        name : "Welcome",
        CanBeDeactivated : 'true',
    },


    //Configured command//
    Commands: {
        wel : {
            name: "Welcome",
            description:"Test the Welcoming message on yourself",
            aliases: ['welcome'],
            usage: '[command name]',
            guildOnly:true,
            cooldown: 5,
            permission: "Owner",
            execute: "Testing_Welcome",
        }
    },

    event: {
        "guildMemberAdd" : "guildMemberAdd",
    },


    Testing_Welcome(message){
        var DiscordBot = require('../discordbot.js');
        DiscordBot.EventOccurs("guildMemberAdd", message.member)
    },


    guildMemberAdd(member){   
        mysql_discord.AddUserToGuild(member.guild, member.user)
        .catch(function(err){console.error(err)})

        var DiscordBot = require('../discordbot.js');
        DiscordBot.Return_Stored_GuildsList(member.guild.id, "Welcome")
        .then(function(Data){
            
            //Send message in private DM with the USER//
            if(Data.get("SendMSGInDM") == 'on'){
                DiscordBot.Draw_MSG_Param(Data.get("CustomMSG"), null, member)
                .then(function(MSG){
                    if(MSG.length > 0){
                        member.send(MSG);
                    }
                })
            }

            //Send message in public channel//
            else {
                var ChannelToSend = (Data.get('ChannelToPost'));
                if(ChannelToSend != undefined || ChannelToSend != 'undefined'){
                    //If the channel ID is chosen//
                    var Channel = member.guild.channels.get(ChannelToSend);
                    if(Channel){ //Check if the channel exist// 
                        DiscordBot.Draw_MSG_Param(Data.get("CustomMSG"), null, member)
                        .then(function(MSG){
                            if(MSG.length > 0){
                                Channel.send(MSG);
                            }
                        })
                    }
                    else { SendMSGInDefaultPublicChannel(Data, member);}
                }
                else {SendMSGInDefaultPublicChannel(Data, member);}
            }
        })

        //This function will send the message in the default welcome channel if it can't retrieve the channel given by the plugin config//
        function SendMSGInDefaultPublicChannel(Data, member){
            var Channel = member.guild.channels.get(member.guild.systemChannelID);

            if(Channel){
                DiscordBot.Draw_MSG_Param(Data.get("CustomMSG"), null, member)
                .then(function(MSG){
                    if(MSG.length > 0){ Channel.send(MSG); }
                })
            }
        }
    }
}
module.exports.main = main;
