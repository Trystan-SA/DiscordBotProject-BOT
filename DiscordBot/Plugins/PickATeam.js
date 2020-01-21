const mysql_discord = require('../Mysql');
var DiscordBot = require('../discordbot.js');
const Discord = require('discord.js');

const main = {

    Configuration: {
        name : "PickATeam",
        CanBeDeactivated : 'true',
    },

    //Configured command//
    Commands: {
        team : {
            name: "TeamList",
            description:"Get a list of all team available on the server.",
            aliases: ['team'],
            usage: '[command name]',
            permission: 'Everyone',
            guildOnly: true,
	        cooldown: 0.5,
            execute: "team",
        }
    },


    team(message){
        Splited_Message = message.content.split(' ');

        //If not parameter 1 -- command to get the list of team//
        if(Splited_Message[1] == undefined){
            //Retrieve Data of PickATeamPlugin//
            DiscordBot.Return_Stored_GuildsList(message.guild.id)
            .then(function(Data){
                var PickATeam_Data = new Map();
                PickATeam_Data = Data['PickATeam'].get('TeamList');

                //Get the prefix for command explanation//
                var PrefixUsed = Data['InternalBehavior'].get('Prefix');
                if(PrefixUsed.length == 0){PrefixUsed = "!";}

                const embed = new Discord.RichEmbed()
                    .setTitle("List of teams you can join")
                    .setColor(0x00AE86)
                    .setDescription(`Type **${PrefixUsed}team join [Name of the Team]** to join a team.  Type **${PrefixUsed}team leave** to leave the current team.`);
                TeamList = new Map(Data['PickATeam']).get('TeamList');
                TeamList.forEach(element => {
                    embed.addField("⠀" + "\n" + element.TeamName, element.TeamDescription + "\n" + "⠀" );
                });
                message.channel.send({embed});
                
            }) .catch(function(err){console.error(err)})
        }



        //If parameter 1 == join or pick -- Command to join a team//
        else if(Splited_Message[1] == "join" || Splited_Message[1] == "pick"){
            var BreakFunction = true;

            DiscordBot.Return_Stored_GuildsList(message.guild.id)
            .then(function(Data){
                var PickATeam_Data = new Map();
                PickATeam_Data = Data['PickATeam'].get('TeamList');


                //A single iteration loop so I can use 'break;'//
                mainloop:
                for(v=0; v < 1; v++){ 
                    


                    //If only '!team join' is entered, draw a message saying they have to precise a team name//
                    if(!Splited_Message[2]){
                        message.reply(`You didn't precised any team. Please re-enter the command like so : '*${message.content} [Team Name]*'`)
                        .then(msg => {msg.delete(10000)})
                        .catch(error =>{console.error(error);})
                        break mainloop;
                    }



                    //If user already have a team, reject his request//
                    for(j=0; j < PickATeam_Data.length; j++){
                        var AlreadyHaveRole = message.member.roles.get(PickATeam_Data[j].TeamDiscordID);
                        if(AlreadyHaveRole){
                            message.reply(`You already joined a Team. use **!team leave** first.`)
                            .then(msg => {msg.delete(10000);})
                            .catch(error =>{console.error(error);})
                            break mainloop;
                        }
                    };



                    //Verify if the team exist
                    var JoinTeam = "";
                    for(i=2; i < Splited_Message.length; i++){
                        JoinTeam += Splited_Message[i] + " ";
                    }
                    var TeamMatchID = "";
                    var TeamMatch_JoinMSG = "";
                    PickATeam_Data.forEach(element => {
                        if(element.TeamName.toLowerCase().replace(/\s/g, "") == JoinTeam.toLowerCase().replace(/\s/g, "")){
                            TeamMatchID = element.TeamDiscordID;
                            TeamMatch_JoinMSG = element.TeamJoinMSG;
                        }
                    });



                    //Verify if the entered Team name match one team inside the PluginConfig//
                    if(TeamMatchID == ""){
                        message.reply(`The Team name you entered doesn't match any Team. Make sure you written it correctly.`)
                        .then(msg => {msg.delete(10000)})
                        .catch(error =>{console.error(error);})
                        break mainloop;
                    }

                    
                    //Verify if a role match the selected Team//
                    var GuildRole = message.guild.roles.get(TeamMatchID);

                    if(!GuildRole){
                        message.reply(`Can't find the Discord Role that match that team. Contact the Owner of this Discord server about this problem.`)
                        .then(msg => {msg.delete(10000)})
                        .catch(error =>{console.error(error);})
                        break mainloop;
                    }



                    //Add the role to the user if everything else above had been passed correctly//
                    message.member.addRole(GuildRole, "Quested PickATeam - Join")
                    .then(function(result){
                        console.log(TeamMatch_JoinMSG);
                        if(TeamMatch_JoinMSG){
                            message.reply(TeamMatch_JoinMSG)
                            .then(msg => {msg.delete(10000)})
                            .catch(error =>{console.error(error);})
                        }
                    })


                    .catch(function(err){
                        console.error(err);
                        message.reply(`Something went wrong. The bot probably doesn't have the permission to assign the role. Check the documentation.`)
                        .then(msg => {msg.delete(10000)})
                        .catch(error =>{console.error(error);})
                    })
                    
                


                }

               /* PickATeam_Data.forEach(function(TeamRole){
                    if(BreakFunction){
                        var TeamMatch = message.member.roles.get(TeamRole.TeamDiscordID);
                        //Member already have a role, stop here...//
                        if(TeamMatch){
                            message.reply(`You already joined a Team. use **!team leave** first.`)
                            .then(msg => {msg.delete(10000);})
                            .catch(error =>{console.error(error);})
                            BreakFunction = false;
                        }

                        //Member Doesn't already have a role. Continue....
                        else { 
                            if(Splited_Message[2]){
                                var JoinTeam = "";
                                for(i=2; i < Splited_Message.length; i++){
                                    JoinTeam += Splited_Message[i] + " ";
                                } 

                                if(JoinTeam === ""){
                                    message.reply(`Can't find the Team. Make sure you written the team name correctly.`)
                                    .then(msg => {msg.delete(10000)})
                                    .catch(error =>{console.error(error);})
                                    BreakFunction = false;
                                }

                                DiscordBot.Return_Stored_GuildsList(message.guild.id)
                                .then(function(Data){
                                    var PickATeam_Data = new Map();
                                    PickATeam_Data = Data['PickATeam'].get('TeamList');
                                    var TeamPassed = "";

                                    var FoundTeam = false;
                                    for(y=0; y < PickATeam_Data.length; y++){
                                        if(PickATeam_Data[y].TeamName == JoinTeam.slice(0, JoinTeam.length -1)){
                                            FoundTeam = true;
                                            TeamPassed = PickATeam_Data[y];
                                            
                                            var GuildRole = message.guild.roles.get(TeamPassed.TeamDiscordID);


                                            message.member.addRole(GuildRole, "Quested PickATeam - Join")
                                            .then(function(result){
                                                message.reply(TeamPassed.TeamJoinMSG)
                                                .then(msg => {msg.delete(10000)})
                                                .catch(error =>{console.error(error);})
                                                BreakFunction = false;
                                            })


                                            .catch(function(err){
                                                console.error(err);
                                                message.reply(`Something went wrong. Make sure the Team correctly match a role.`)
                                                .then(msg => {msg.delete(10000)})
                                                .catch(error =>{console.error(error);})
                                                BreakFunction = false;
                                            })
                                        }
                                    }
                                    if(FoundTeam === false){
                                        message.reply(`Can't find team.`)
                                        .then(msg => {msg.delete(10000);})
                                        .catch(error =>{console.error(error);})
                                    }
                                })
                            }
                            else { //if no team at parameter 2. Send an error message//
                                message.reply(`You didn't precised any team. Please re-enter the command like so : '*${message.content} [Team Name]*'`)
                                .then(msg => {msg.delete(10000)})
                                .catch(error =>{console.error(error);})
                            }
                        }
                    }
                    else {}
                })*/
            })
        }

        //If parameter 1 == leave or quit -- Command to leave a team//
        else if(Splited_Message[1] == "leave" || Splited_Message[1] == "quit"){
            DiscordBot.Return_Stored_GuildsList(message.guild.id)
            .then(function(Data){
                var PickATeam_Data = new Map();
                PickATeam_Data = Data['PickATeam'].get('TeamList');
                PickATeam_Data.forEach(function(TeamRole){
                    var TeamMatch = message.member.roles.get(TeamRole.TeamDiscordID);
                    if(TeamMatch){
                        message.member.removeRole(TeamMatch)
                    }
                })
            })
        }
    },



}


module.exports.main = main;