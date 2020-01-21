const Mysql = require('./Mysql');
const fetch = require('node-fetch');
var request = require("request");
var Discordbot = require('./discordbot');
var PaypalOauth = '';




async function SinglePremiumVerificiation(bot, guildID){
    return new Promise((resolve, reject)=>{
        Paypal_GetBearerToken()
        .then(function(BearerToken){
            bot.guilds.forEach(guild=>{
                if(guild.id == guildID){
                    VerifyThisGuild(guild)
                    .then(function(result){resolve(result)})
                    .catch(function(err){reject(err);})
                }
            })
        })
        .catch(function(error){reject(error);})
    })
}
module.exports.SinglePremiumVerificiation = SinglePremiumVerificiation;



async function PremiumVerification(bot){ 
    return new Promise((resolve, reject)=>{

        console.log("Daily veryfing Paypal subscription running...");
        Paypal_GetBearerToken()
        .then(function(result){
            bot.guilds.forEach(guild=> {
                VerifyThisGuild(guild)
                .then(function(result){resolve(result)})
                .catch(function(err){reject(err);})
            })
        })
    })
}
module.exports.PremiumVerification = PremiumVerification;

async function VerifyThisGuild(guild){
    return new Promise((resolve, reject)=>{
        Mysql.Get_ServerPremiumInfo(guild.id)
        .then(function(result){
            if(result != ''){
                console.log("--- Verifying : " + guild.name + " ---");
                var data = result[0]['PremiumInfo'];
                data = JSON.parse(data);
                var premiumpass = result[0]['PremiumPass'];
                var Tier1TerminationNotif = result[0]['Tier1TerminationNotif'];
                var MemberCount = guild.memberCount + 25005; //TODO : /!\ /!\ DELETE THE '+ 25005' IN PRODUCTION /!\ /!\


                //I am not making the server premium again.
                /*if(premiumpass === 0){ //If the server is NOT premium, check if it enter the free plan so he can return to premium//
                    if(MemberCount <= 100){ 
                        //ACTION : MAKE THE SERVER PREMIUM
                        Mysql.Paypal_MakeTheServerPremium(guild.id)
                        .then(function(result){resolve("[SUBSCRIPTION] " + guild.name + " - Successfully gived premium membership");})
                        .catch(function(err){reject("[ERROR] " + guild.name + " - Error while trying to give premium pass || " + err);})
                    }
                }*/

                if (premiumpass === 1){ //If the server is premium, check if it still be//
                    if(data === 0){
                        if(MemberCount <= 100){resolve("[SUBSCRIPTION] " + guild.name + " - No subscription running -- Free tier plan");} 
                        else if(MemberCount > 100 && MemberCount <= 2500){
                            Mysql.Paypal_DemakeTheServerPremium(guild.id)
                            .then(function(result){resolve("[SUBSCRIPTION] " + guild.name + " - Successfully UNGIVED premium membership");})
                            .catch(function(err){reject("[SUBSCRIPTION] " + guild.name + " - Error while trying to UNGIVE premium pass || " + err);})
                        }
                        else if(MemberCount > 2500){
                            Mysql.Paypal_DemakeTheServerPremium(guild.id)
                            .then(function(result){resolve("[SUBSCRIPTION] " + guild.name + " - Successfully UNGIVED premium membership");})
                            .catch(function(err){reject("[SUBSCRIPTION] " + guild.name + " - Error while trying to UNGIVE premium pass || " + err);})
                        }
                    }
                    else{
                        Paypal_GetSubscription(data.SubscriptionID)
                        .then(function(body){
                            var status = body.status;
                            var LastPayment = new Date('2000-10-10T03:24:00');
                            if(body.billing_info.last_payment){
                                LastPayment = new Date(body.billing_info.last_payment.time);
                            }

                            //The premium membership is valid and can continue.
                            if(status == "ACTIVE"){

                                if(body.plan_id == "P-1R917480PJ170640ALVFRLDA"){ //Mean, Tier 1, verify that the limit it still valid.
                                    if(MemberCount > 2500){ //Not in tier 1 anymore.
                                        if(Tier1TerminationNotif == 0){
                                            console.log("Wow");
                                            Discordbot.NotifyGuildOwner(guild.id, 
    `Wow ! It seams that your Discord Server '**{guildname}**' have now **{membercount} members**, It's awesome !
    Now that you've got so many new people inside your discord server, the current subscription plan is not valid anymore and will not be renewed for the next month.
    Be sure to visit http://localhost:8080/pricing to get next Premium subscription for your Discord server. 
    Don't hesitate to Email us at {emailcontact} if you have questions :)
    `);
                                        }
                                        Mysql.connection_ConfigDB.query(`UPDATE guildtable SET Tier1TerminationNotif='1' WHERE GuildID='${guild.id}'`, function(err, result, fields){});
                                        SetActiveStatus("CANCELLED")
                                        Mysql.Paypal_CancelSubscription(guild.id, LastPayment);
                                    }
                                    else {SetActiveStatus("ACTIVE"); }
                                }
                                else { //Mean tier 2, no limit validation to make.
                                    SetActiveStatus("ACTIVE");
                                }

                                function SetActiveStatus(status){
                                    Mysql.connection_ConfigDB.query(`SELECT PremiumInfo FROM guildtable WHERE GuildID='${guild.id}'`, function(err, result, fields){
                                        if(err){reject("[ERROR] - Mysql Selecting PremiumInfo from guildtable where guildid match || " + err);}
                                        else if (result){
                                            result = result[0]['PremiumInfo'];
                                            var ParsedResult = JSON.parse(result);
                                            if(ParsedResult.Status != status){
                                                ParsedResult.Status = status;
                                                ParsedResult = JSON.stringify(ParsedResult);
                                
                                                Mysql.connection_ConfigDB.query(`UPDATE guildtable SET PremiumInfo='${ParsedResult}' WHERE GuildID='${guild.id}';`, function(err, result, fields){
                                                    if(err){reject("[ERROR] - Mysql Update guildtable premiuminfo where guildid match || " + err);}
                                                    else if(result){
                                                        resolve("[SUBSCRIPTION] STATUS : Active || Update the premium info of the target");
                                                    }
                                                })
                                            }
                                        }
                                    })
                                }
                            }
                            //If the status is "EXPIRED". Mean that the subscription is over.
                            //Will set the premium status to Expired and will deactivate the premium permissions of the server
                            else if(status == "EXPIRED") {
                                Mysql.Paypal_DELETE_Subscription(guild.id)
                                .then(function(result){resolve("[SUBSCRIPTION] STATUS : Expired || Deleted the premiuminfo of the target")})
                                .catch(function(err){reject("[SUBSCRIPTION] " + guild.name + " - Error while trying to delete subscription for guild ||" + err);})
                            }

                            //If the status is "CANCELLED" or "SUSPENDED", mean that the user still have the premium of this month.
                            //Will check if the current month is over every day, if it is over, will set the premium value like "EXPIRED"
                            else if (status == "CANCELLED"){
                                Mysql.Paypal_CancelSubscription(guild.id,  LastPayment)
                                .then(function(result){resolve("[SUBSCRIPTION] STATUS : CANCELLED || Canceled the current subscription, waiting for the and of payment to delete premium rights")})
                                .catch(function(err){reject("[ERROR] - Mysql_CancelSubscription ||" + err);})
                            }

                            else if (status == "SUSPENDED"){
                                Mysql.Paypal_DELETE_EVERYTHING(guild.id)
                                .then(function(result){resolve("[SUBSCRIPTION] STATUS : Suspended || Deleted every premium data info of the target")})
                                .catch(function(err){reject("[ERROR] - Mysql_Paypal_DELETE_Everything")})
                            }
                        })
                        .catch(function(err){reject(err);})
                    }
                }
            }
            resolve('No Subscription')
        })
        .catch(function(err){reject("[SUBSCRIPTION] " + guild.name + " - Error while retrieving Guild ServerPremiumInfo  " + err);})
    })
}



async function Paypal_GetBearerToken(){
    return new Promise((resolve, reject)=>{
        try{
            var Key = 'Basic ' + Buffer.from('ATs8D4ekzioCA2W5XqCJgLM1E_3_FXadPsr6KRQhyK0zvDzXvuynilPYTF2fHlMHTwpqpSh4wXrZ6Wy8:ENU9fzAZlCRX4y_ICFu2vPghKkJD1LX3erWj9gJWME72aVvZMstWjDODOQ_Phe79uAKf5KlCry8VSzM3').toString('base64');
            var options = {
                method : 'POST', 
                url: 'https://api.sandbox.paypal.com/v1/oauth2/token',
                headers: {
                    'Authorization': Key,
                    'Content-Type':'application/x-www-form-urlencoded'
                },
                form:{grant_type: 'client_credentials'}
            }
            
            request(options, function(err, response, body){
                if(err){reject(err);}
                else if(body){ body = JSON.parse(body); PaypalOauth = body.access_token; resolve(true)}
            })

        } catch{reject(true);}
    })
}

async function Paypal_GetSubscription(SubscriptionID){
    return new Promise((resolve, reject)=>{
        try {
            var options = {
                method: 'GET',
                url: `https://api.sandbox.paypal.com/v1/billing/subscriptions/${SubscriptionID}`,
                headers : {
                    'Authorization' : `Bearer ${PaypalOauth}`,
                    'Content-Type' : 'application/json' 
                },
            }

            request(options, function(error, response, body){
                if(error){reject(error);}
                else if (body){body = JSON.parse(body); resolve(body);}
            })
        } catch{reject();}
    })
}