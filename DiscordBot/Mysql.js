var mysql = require('mysql');
const fs = require('fs');
const NodeCache = require("node-cache");
const Cache = new NodeCache({stdTTL : 360});
const Discordbotjs = require('./discordbot');
const crypto = require('crypto');

var connection_Quested = mysql.createConnection({
    host : process.env.MYSQL_HOST,
    user : process.env.MYSQL_USER,
    password : process.env.MYSQL_PASS,
    port : process.env.MYSQL_PORT,
    database : 'quested',
    charset : 'utf8mb4'
});
module.exports.connection_Quested = connection_Quested;



/** Take an array of guildID as parameter
 *  In return it will populate the bot.GuildList variable
 */
async function Get_GuildPluginData(ArrayID){
    return new Promise((resolve, reject)=>{
        var PluginDataArray = new Map;

        ArrayID.forEach((GuildID, index)=>{

            connection_Quested.query(`SELECT * FROM quested.Guild LEFT JOIN quested.PremiumSubscription ON quested.Guild.PremiumSubscriptionID = quested.PremiumSubscription.PremiumSubscriptionID WHERE quested.Guild.GuildID = '${GuildID}'`,
            function(err, result, fields){

                if(err){PluginDataArray.set(GuildID, undefined); IsEndOfForeach(index, ArrayID.length);}
                else if(result){
                    try {
                        //Maybe if one day I want to retrieve the SubscriptionID, buyer Email, Status, price or DayofPayement...//
                        //console.log(result[0]['PremiumInfo']);
                        var PremiumPass = (result[0]['PremiumPass']);
                        var value = result[0]['PluginsConfig'];

                        value = JSON.stringify(value);
                        var newvalue = value    .replace(/\\"/g, '"')
                                                .replace(/\\n/g, '\\n');
                                                              
                        newvalue = newvalue.slice(1, newvalue.length - 2);

                        //Adding additional data about the premium membership and pass//
                        newvalue += ',"PremiumInfo":[';
                        newvalue += '["PremiumPass", "' + PremiumPass + '"]';
                        newvalue += ']}';

                        var parsedResult = JSON.parse(newvalue);

                        PluginDataArray.set(GuildID, parsedResult);
                        IsEndOfForeach(index, ArrayID.length);

                    } catch {
                        PluginDataArray.set(GuildID, undefined);
                        IsEndOfForeach(index, ArrayID.length);
                    }
                }
            })
        })
    
        function IsEndOfForeach(indexes, arrayidlenght){
            if(indexes === arrayidlenght - 1){
                resolve(PluginDataArray);
            }
        }
    })
}
module.exports.Get_GuildPluginData = Get_GuildPluginData;


/** Get server premium Info by it's guild ID */
async function Get_ServerPremiumInfo(GuildID){
    return new Promise((resolve, reject)=>{
        connection_Quested.query(`SELECT quested.PremiumSubscription.* FROM quested.PremiumSubscription, quested.Guild WHERE quested.Guild.GuildID = '${GuildID}' AND quested.PremiumSubscription.PremiumSubscriptionID = quested.Guild.PremiumSubscriptionID`, function(err, result, fields){
            if(err){reject(err);}
            else if(result){resolve(result);}
        })
    })
}
module.exports.Get_ServerPremiumInfo = Get_ServerPremiumInfo;




/** Add a guild inside the Database system
 *  This will populate everything from the "Owner_has_Guild", "Guild", "analytics" ect...
 *  Take the DiscordJS Guild object as parameter
 */
async function Add_Guild(Guild){
    return new Promise((resolve, reject)=>{
        console.notice("Addguild function called");
        var date = GetDate();
        crypto.randomBytes(16, function(err, buffer){
            var token = buffer.toString('hex');
        
            //Add a new entry inside the Guild Table//
            connection_Quested.query(`INSERT INTO Guild (GuildID, GuildName, MemberCount, JoinedQuestedAt, IconHash, Token) VALUES ('${Guild.id}', '${Guild.name}', '${Guild.memberCount}', STR_TO_DATE("${date}", '%d-%m-%Y') , '${Guild.icon}', '${token}');`,
            function(err, result){
                if(err){reject(err);}
                else if (result){

                    connection_Quested.query(`INSERT INTO Owners (OwnerDiscordID, Username, AvatarHash, discriminator) 
                    VALUES ('${Guild.owner.id}', '${Guild.owner.user.username}', '${Guild.owner.user.avatar}', '${Guild.owner.user.discriminator}')`,
                    function(err2, result2){
                        
                        connection_Quested.query(`INSERT INTO Owners_has_Guild (OwnerDiscordID, GuildID) VALUES ('${Guild.ownerID}', '${Guild.id}')`,
                        function(err3, result3){
                                resolve();    
                        })
                    })
                }
            })
        })
    })
}
module.exports.Add_Guild = Add_Guild;



/** Check if the given guild exist inside the Database
 *  Reject if the guild Exist, Resolve if not exist.
 */
async function Is_GuildExist(GuildID){
    return new Promise((resolve, reject)=>{
        connection_Quested.query(`SELECT GuildID FROM Guild WHERE GuildID = '${GuildID}'`, function(err, result){

            if (result){
                if(result == ''){resolve(true)} //Resolve if the guild doesn't exist
                else {reject("Guild Already present in DB")} //Reject if the guild exist
            }
        })
    })
}
module.exports.Is_GuildExist = Is_GuildExist;





function GetDate(){
    var CurrentTime = new Date();
    var Month = CurrentTime.getMonth();
    var Day = CurrentTime.getDate();

    if(Month < 10){Month = "0" + Month}
    if(Day < 10){Day = "0" + Day};

    var MysqlDateFormat = `${Day}-${Month}-${CurrentTime.getFullYear()}`;
    // DAY, MONTH, YEAR   === %D %M %Y //
    return MysqlDateFormat;

        //var DateMonthYear = Day + "/" + Month + "/" + CurrentTime.getFullYear();
        //return DateMonthYear;
}










/*
//Create a new table for the Guild users inside the GuildDB table. 
async function CreateNewGuildTable(Guild){
    return new Promise((resolve, reject)=>{

        console.notice("CREATE NEW GUILD TABLE");
        var sql = `
            CREATE TABLE T${Guild.id} (
                ID int NOT NULL UNIQUE AUTO_INCREMENT,
                DiscordID varchar(255),
                AvatarURL varchar(255),
                Username varchar(255),
                Team int,
                Inventory LONGTEXT,
                Achievements LONGTEXT,
                Coin BIGINT,
                Karma BIGINT,
                PRIMARY KEY (ID)
            );`;
        connection_GuildTable.query(sql, function(err, result, fields){
            if(err){reject(err)}
            else if(result){
                resolve(result);
            }
        })

        resolve(true);
    })
}
module.exports.CreateNewGuildTable = CreateNewGuildTable;



//Create a new configuration entry inside de ConfigDB table//
async function CreateNewConfigGuildEntry(guild){
    return new Promise((resolve, reject)=>{

        var Default_PluginConfig = `{"InternalBehavior":[["Activated", "false"],["Prefix",""],["FuseauHoraire",""]],"Welcome":[["Activated", "true"],["SendMSGInDM","on"],["ChannelToPost","615272638155194368"],["CustomMSG","Welcome  {@user} !"]],"PickATeam":[["Activated", "true"],["Test","true"]]}`;
        
        var Hashresult           = '';
        var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        for ( var i = 0; i < 32; i++ ) {
            Hashresult  += characters.charAt(Math.floor(Math.random() * charactersLength));
        }

        connection_ConfigDB.query(`
            INSERT INTO guildtable (GuildName, GuildID, PluginsConfig, PremiumInfo, AccessToken)
            VALUES ('${guild.name}' , '${guild.id}', '${Default_PluginConfig}', '0', '${ Hashresult }' );`
        , function(err, result, fields){
            if(err){reject(err)}
            else if (result){resolve("[INFO] - New guild created : " + guild.name);}
        })
       
    })
}
module.exports.CreateNewConfigGuildEntry = CreateNewConfigGuildEntry;



//Check if a table for that Guild.id exist. If it doesn't exist, return a resolve with true. If already present, reject an error message//
async function CheckIfGuildTableExist(Guild){
    return new Promise((resolve, reject)=>{
        connection_GuildTable.query("SELECT * FROM T" + Guild.id + "", 
        function(err, result, fields){      
            if(err){
                if(err.code == 'ER_NO_SUCH_TABLE'){resolve(true);}
            }
            else if (result){reject("Already present inside DB");}
        })
    })
}
module.exports.CheckIfGuildTableExist = CheckIfGuildTableExist;




async function AddUserToGuild(guild, USER){
    return new Promise((resolve, reject)=>{

        //### TO DO ###//
        var default_guild_coin = 100;
        var default_guild_karma = 1;
        //------------///

        connection_GuildTable.query(`
            INSERT INTO T${guild.id} (DiscordID, AvatarURL, Username, Coin, Karma)
            SELECT * FROM (SELECT '${USER.id}', '${USER.avatar}', '${USER.username}', '${default_guild_coin}', '${default_guild_karma}') AS tmp
            WHERE NOT EXISTS (
                    SELECT DiscordID FROM T${guild.id} WHERE DiscordID = '${USER.id}'
                ) LIMIT 1; `     
        , function(err, result, fields){
            if(err){reject(err)}
            else if (result){ resolve(result)}
        });            
    })
}
module.exports.AddUserToGuild = AddUserToGuild;





//This function is called every time someone make a command, or everytime the bot need the configuration data//
//It will get data from the desired guild (inside the Mysql DB)//
//Then store it inside the bot Cache (RAM) for a bunch of seconds//
async function Get_PluginData(GuildID){
    return new Promise((resolve, reject)=>{
        Cache.get(`${GuildID}`, function(err, value){ //Get if  already cached//
            if(!err) {
                if(value == undefined){ //IF KEY NOT FOUND inside the cache - Retrieve them inside the DataBase //
                    connection_ConfigDB.query(`SELECT PluginsConfig FROM guildtable WHERE GuildID='${GuildID}';`, function(err, result, fields){
                        if(err){ reject(err)}
                        else {        
                            if(result !== ""){
                                result = (JSON.parse(result[0]['PluginsConfig']));
                                Cache.set(`${GuildID}`, result ,function(err, success){ //Store the value to the cache//
                                    if(!err && success){ 
                                        console.notice("Stored successfull result to cache and resolved it");
                                        resolve(result); //Return the value
                                    }
                                });
                            } 
                    
                            else { //If the result returned nothing, apply a default configuration//
                                console.error("Mysql Get_PluginData failed : Returned empty");
                                var PluginsConfig = {
                                    Prefix: "!"
                                }
                                resolve(PluginsConfig);
                            }
                        }
                    });
                }
                else {console.info("value data resolved through cache."); resolve(value);}
            }
            else {console.error("Cache retrieve failed"); reject(err);}
        });
    });
}
module.exports.Get_PluginData = Get_PluginData;



//Parameter is an array with every GuildID to retrieve//
//Will fetch the Plugindata present inside the Mysql DB//
async function FetchMultipleGuildPluginData(ArrayID){
    return new Promise((resolve, reject)=>{
        var PluginDataArray = new Map;

        ArrayID.forEach((element, index)=>{
            connection_ConfigDB.query(`SELECT PluginsConfig, PremiumInfo, PremiumPass FROM guildtable WHERE GuildID='${element}';`, function(err, result, fields){
                if(err){PluginDataArray.set(element, undefined); IsEndOfForeach(index, ArrayID.length);}
                else if(result){
                    try {
                        //Maybe if one day I want to retrieve the SubscriptionID, buyer Email, Status, price or DayofPayement...//
                        //console.log(result[0]['PremiumInfo']);
                        var PremiumPass = (result[0]['PremiumPass']);
                        var value = result[0]['PluginsConfig'];

                        value = JSON.stringify(value);
                        var newvalue = value    .replace(/\\"/g, '"')
                                                .replace(/\\n/g, '\\n');
                                                              
                        newvalue = newvalue.slice(1, newvalue.length - 2);

                        //Adding additional data about the premium membership and pass//
                        newvalue += ',"PremiumInfo":[';
                        newvalue += '["PremiumPass", "' + PremiumPass + '"]';
                        newvalue += ']}';

                        var parsedResult = JSON.parse(newvalue);

                        PluginDataArray.set(element, parsedResult);
                        IsEndOfForeach(index, ArrayID.length);

                    } catch {
                        PluginDataArray.set(element, undefined);
                        IsEndOfForeach(index, ArrayID.length);
                    }
                }
            })
        })
    
        function IsEndOfForeach(indexes, arrayidlenght){
            if(indexes === arrayidlenght - 1){
                resolve(PluginDataArray);
            }
        }
    })
}
module.exports.FetchMultipleGuildPluginData = FetchMultipleGuildPluginData;



//This function will go through every guildconfig inside the database and will correct the missing or added fields to the DB//
async function Update_Missing_PluginData_Fields(){
    return new Promise((resolve, reject)=>{
        console.notice("Running Data plugins reparation...");

        var Time_Start = new Date();
        var ErrorStack = "";


        //Part 1 - Get the Plugins configuration of the bot and store them inside a JSON string//
        var pluginFiles = fs.readdirSync('./DiscordBot/Plugins').filter(file => file.endsWith('.js'));
        var CONFIG_OBJ = "";

        for(var i = 0; i < pluginFiles.length; i++){ //Loop trough every file//
            file = pluginFiles[i];
            var plugin = require(`./Plugins/${pluginFiles[i]}`);
            var data = plugin.main.Data;

            if(data !== undefined){
                CONFIG_OBJ = CONFIG_OBJ.concat('"' + plugin.main.name + '" : ' + JSON.stringify(data) + ',');
            }
        }

        CONFIG_OBJ = CONFIG_OBJ.slice(0,CONFIG_OBJ.length - 1);
        CONFIG_OBJ = "{" + CONFIG_OBJ + "}"; 

        try{
            CONFIG_OBJ = JSON.parse(CONFIG_OBJ);

            
            //Part 2 - Get every guild config//
            connection_ConfigDB.query("SELECT * FROM guildtable", function(err, rows, fields){
                if(err){reject(err)}

                else {
                    for (var i = 0 ; i < rows.length; i++){        
                        //Part 3 - For each guild config entry, compare them with the configuration plugins of the bot//         
                        Entry_ID = rows[i].ID;
                        try{
                            Entry_Config = JSON.parse(rows[i]["PluginsConfig"]);
                            NewJSONData = "{ ";
                
                            //For each OBJ plugins
                            for(OBJ_Plugins_Index = 0; OBJ_Plugins_Index < Object.keys(CONFIG_OBJ).length; OBJ_Plugins_Index++){

                                var OBJ_Current_PluginName = Object.keys(CONFIG_OBJ)[OBJ_Plugins_Index];
                                var SamePluginNameFound = false;


                                for(Entry_Plugin_Index = 0; Entry_Plugin_Index < Object.keys(Entry_Config).length; Entry_Plugin_Index++){ //Check every plugins name inside "Entry" to match the current plugin gathered//
                                    SamePluginNameFound = false; //Initialize variable//
                                    var Entry_Current_PluginName = Object.keys(Entry_Config)[Entry_Plugin_Index];

                                    if(Entry_Current_PluginName === OBJ_Current_PluginName){

                                        SamePluginNameFound = true;
                                        var ObjectEntriesOfThatPlugin = Object.keys(Object.values(CONFIG_OBJ)[OBJ_Plugins_Index]).length; //Get the number of data entries of the current plugin for CONFIG_OBJ//
                                        NewJSONData = NewJSONData + '"' + OBJ_Current_PluginName + '" : {';

                                        for(OBJ_Data_Index = 0; OBJ_Data_Index < ObjectEntriesOfThatPlugin ; OBJ_Data_Index++){ //Go through every Data entry of that particular plugin//                                        
                                            var EntryEntriesOfThatPlugin = Object.keys(Object.values(Entry_Config)[Entry_Plugin_Index]).length;
                                            var SameEntryNameFound = false;

                                            for(Entry_Data_Index = 0; Entry_Data_Index < EntryEntriesOfThatPlugin; Entry_Data_Index++){
                                                
                                                //If the entries are the same, do nothing and break the loop
                                                if(Object.keys(Object.values(Entry_Config)[Entry_Plugin_Index])[Entry_Data_Index] ===  Object.keys(Object.values(CONFIG_OBJ)[OBJ_Plugins_Index])[OBJ_Data_Index]){
                                                    SameEntryNameFound = true;
                                                    break;
                                                }
                                                else {
                                                //If the entries are not the same, continue the loop while the end of the entry length//
                                                }
                                            }
                                            
                                            //If a difference inside the entries are found, add the entry here//
                                            if(SameEntryNameFound === false){
                                                NewJSONData = NewJSONData + ('"' +  Object.keys(Object.values(CONFIG_OBJ)[OBJ_Plugins_Index])[OBJ_Data_Index] + '":"' + Object.values(Object.values(CONFIG_OBJ)[OBJ_Plugins_Index])[OBJ_Data_Index] + '", ');
                                            }

                                            //Here keep the entry data because the configuration shema are the same but the data may be different, so we want to keep the customized data//
                                            else if(SameEntryNameFound === true){
                                                NewJSONData = NewJSONData + ('"' + Object.keys(Object.values(Entry_Config)[Entry_Plugin_Index])[Entry_Data_Index] + '":"' + Object.values(Object.values(Entry_Config)[Entry_Plugin_Index])[Entry_Data_Index] + '", ');
                                            }
                                        }

                                        NewJSONData = NewJSONData.slice(0, NewJSONData.length - 2);
                                        NewJSONData = NewJSONData + '} ,';
                                        break;
                                    }
                                } 

                                if(SamePluginNameFound === false){ //If the plugin is not present inside the stored data, add the default value  
                                NewJSONData = NewJSONData + ('"'+OBJ_Current_PluginName+'": ' + JSON.stringify(CONFIG_OBJ[OBJ_Current_PluginName]) + ", ");
                                }
                            }
                                 
                            NewJSONData = NewJSONData.slice(0, NewJSONData.length -2);
                            NewJSONData = NewJSONData + "}";

                            try{
                                catchbadjson = JSON.parse(NewJSONData);
                                
                                connection_ConfigDB.query(`UPDATE guildtable SET PluginsConfig = '${NewJSONData}' WHERE ID=${Entry_ID}`);
                            } catch(err){
                                var err = "ERROR - Catched invalid JSON data right before it was sent : Verify that the Bot plugin data are JSON valid"
                                ErrorStack += err;
                            }

                            

                            } catch(err){
                                var err = "ERROR - Update_Missing_PluginData_Fields - WHILE PARSING JSON 'PluginsConfig' FROM 'ConfigDB guildtable' at GUILDID : " + Entry_ID + '\n';
                                ErrorStack += err;

                                connection_ConfigDB.query(`UPDATE guildtable SET PluginsConfig = '${JSON.stringify(CONFIG_OBJ)}' WHERE ID =${Entry_ID}`);
                            }
                        }        
                    }    
                    var end = new Date() - Time_Start;
                    
                    if(ErrorStack !== ""){reject(ErrorStack)}
                    else {
                        resolve("Finished query in : " + end + "ms");
                    }
                })
            } catch(err){
            reject ("ERROR - Update_Missing_PluginData_Fields - WHILE PARSING JSON BOT PLUGINS FILES");
        }
    })
}
module.exports.Update_Missing_PluginData_Fields = Update_Missing_PluginData_Fields;




//This function will deactivate the premium membership and will set the status of the subscription as expired (for display purpose)//
async function Paypal_DELETE_Subscription(GuildID){
    return new Promise((resolve, reject)=>{

        connection_ConfigDB.query(`SELECT PremiumInfo FROM guildtable WHERE GuildID='${GuildID}'`, function(err, result, fields){
            if(err){console.error(err)}
            else if (result){
                result = result[0]['PremiumInfo'];
                var ParsedResult = JSON.parse(result);
                ParsedResult.Status = "EXPIRED";
                ParsedResult = JSON.stringify(ParsedResult);

                connection_ConfigDB.query(`UPDATE guildtable SET PremiumPass='0', PremiumInfo='${ParsedResult}' WHERE GuildID='${GuildID}';`, function(err, result, fields){
                    if(err){reject(err);}
                    else if(result){
                        Discordbotjs.RefreshGuild(GuildID);
                    }
                })
            }
        })
    })
}
module.exports.Paypal_DELETE_Subscription = Paypal_DELETE_Subscription;

async function Paypal_DELETE_EVERYTHING(GuildID){
    return new Promise((resolve, reject)=>{
        connection_ConfigDB.query(`UPDATE guildtable SET PremiumPass='0', PremiumInfo='0' WHERE GuildID='${GuildID}';`, function(err, result, fields){
            if(err){reject(err);}
            else if (result){
                Discordbotjs.RefreshGuild(GuildID);
            }
        })
    })
}
module.exports.Paypal_DELETE_EVERYTHING = Paypal_DELETE_EVERYTHING;

async function Paypal_CancelSubscription(GuildID, Last_Payment){
    var CurrentTime = new Date();
    var NextPayment = new Date(Last_Payment);
    NextPayment.setMonth(NextPayment.getMonth() + 1);

    if(CurrentTime > NextPayment){
        Paypal_DELETE_Subscription(GuildID);
    }
    else {
        connection_ConfigDB.query(`SELECT PremiumInfo FROM guildtable WHERE GuildID='${GuildID}'`, function(err, result, fields){
            if(err){console.error(err)}
            else if (result){
                result = result[0]['PremiumInfo'];
                var ParsedResult = JSON.parse(result);

                if(ParsedResult.Status != "CANCELLED"){
                    ParsedResult.Status = "CANCELLED";
                    ParsedResult = JSON.stringify(ParsedResult);

                    connection_ConfigDB.query(`UPDATE guildtable SET PremiumInfo='${ParsedResult}' WHERE GuildID='${GuildID}';`, function(err, result, fields){
                        if(err){reject(err);}
                        else if(result){
                            Discordbotjs.RefreshGuild(GuildID);
                        }
                    })
                }
            }
        })
    }
}
module.exports.Paypal_CancelSubscription = Paypal_CancelSubscription;



async function Paypal_MakeTheServerPremium(GuildID){
    return new Promise((resolve, reject)=>{
        connection_ConfigDB.query(`UPDATE guildtable SET PremiumPass='1' WHERE GuildID='${GuildID}';`, function(err, result, fields){
            if(err){reject(err);}
            else if(result){Discordbotjs.RefreshGuild(GuildID); resolve(true);}
        })
    })
}
module.exports.Paypal_MakeTheServerPremium = Paypal_MakeTheServerPremium;


async function Paypal_DemakeTheServerPremium(GuildID){
    return new Promise((resolve, reject)=>{

        //Will check the TrialDays field before removing or not the PremiumPass of this server.
        //If FreeTrialDays = 0, can activate the freeTrial
        //Else if = 1. Deactivate the premium membership normally.
        //Else if JS Date values. Check if expired. If yes, deactivate the Premium Membership. Else, do nothing. 
        connection_ConfigDB.query(`SELECT FreeTrialDays FROM guildtable WHERE GuildID='${GuildID}';`, function(err, result, fields){
            if(err){reject(err);}
            else if(result){
                var FreeTrialDays = result[0]['FreeTrialDays'];

                if(FreeTrialDays == 0){
                    var CurrentTime = new Date();
                    var NextMonthTime = new Date();
                    NextMonthTime.setDate(CurrentTime.getDate() + 30);

                    connection_ConfigDB.query(`UPDATE guildtable SET FreeTrialDays='${NextMonthTime}' WHERE GuildID='${GuildID}';`, function(err, result, fields){
                        if(err){reject(err);}
                        else if(result){
                            resolve(true);

                            Discordbotjs.NotifyGuildOwner(GuildID, 
`Hi ! It seams that your Discord Server '**{guildname}**' have now **{membercount} members**, It's great !
Quested Free Tier is for guild under 100 members only. Since you are over this Free Tier, 
you will have to subscribe to Quested to keep access to all premium features of the bot. 
Don't worry, __we offer you an additional 30 days__ of premium membership so you have time to think about it :) 
Click here to see the subscription price and FAQ : http://localhost:8080/pricing
                                `);
                        }
                    })
                }
                else if(FreeTrialDays == 1){
                    connection_ConfigDB.query(`UPDATE guildtable SET PremiumPass='0' WHERE GuildID='${GuildID}';`, function(err, result, fields){
                        if(err){reject(err);}
                        else if(result){Discordbotjs.RefreshGuild(GuildID); resolve(true);}
                    })
                }
                else {
                    var CurrentDate = new Date();
                    var FreeTrialDate = new Date(FreeTrialDays);

                    if(CurrentDate > FreeTrialDate){
                        connection_ConfigDB.query(`UPDATE guildtable SET PremiumPass='0', FreeTrialDays='1' WHERE GuildID='${GuildID}';`, function(err, result, fields){
                            if(err){reject(err);}
                            else if (result){resolve(true)}
                        }) 
                    }
                    else {
                        var CurrentDate = new Date();
                        var before14days = new Date(FreeTrialDate);
                        var before15days = new Date(FreeTrialDate);
                        var before3days = new Date(FreeTrialDate);
                        var before4days = new Date(FreeTrialDate);
                        before14days.setDate(FreeTrialDate.getDate() - 14);
                        before15days.setDate(FreeTrialDate.getDate() - 15);
                        before3days.setDate(FreeTrialDate.getDate() - 3);
                        before4days.setDate(FreeTrialDate.getDate() - 4);

                      
                        
                        

                        

                        if(before15days <= CurrentDate && CurrentDate < before14days){
                            Discordbotjs.NotifyGuildOwner(GuildID, 
`Hi ! You have only 15 days remaining on your Quested free trial.
If you want to keep all the premium features of Quested for your server '**{guildname}**', don't forget to subscribe to Quested premium membership
Click here to see the subscription price and FAQ : {pricinglink}
If you have any questions, don't hesitate to write us an Email at {emailcontact}
Have a nice day :)
                            `);
                        }

                        if(before4days <= CurrentDate && CurrentDate < before3days){
                            Discordbotjs.NotifyGuildOwner(GuildID, 
`Hi ! You have only 3 days remaining on your Quested free trial.
Don't forget to get a Quested subscription for your guild '**{guildname}**', or you will loose access to all the premium features of the Quested bot !
Click here to see the subscription price and FAQ : {pricinglink}
If you have any questions, don't hesitate to write us an Email at {emailcontact}
                            `);
                        }

                        resolve(true);
                    }
                }
            }
        })
    })
}
module.exports.Paypal_DemakeTheServerPremium = Paypal_DemakeTheServerPremium;






//##################################//
//######      ANALYTICS     ########//
//##################################//

async function Create_NewAnalyticsTable(GuildID){
    return new Promise((resolve, reject)=>{
        connection_Analytics.query(`CREATE TABLE T${GuildID}(
            ID int NOT NULL UNIQUE AUTO_INCREMENT, 
            Date DATE UNIQUE, 
            membercount MEDIUMINT(6), 
            onlinecount MEDIUMINT(6), 
            totalmessages MEDIUMINT(8), 
            PRIMARY KEY (ID)
            );`
            , function(err, result, fields){
            if(err){
                if(err.code == "ER_TABLE_EXISTS_ERROR"){
                    resolve(true);
                }
                else { reject(err);}
            }
            else if (result){
                resolve(result);
            }
        })
    })
}
module.exports.Create_NewAnalyticsTable = Create_NewAnalyticsTable;


async function Push_AnalyticsData_membercount(GuildID, membercount){

    var Analyticsdate = GetAnalyticDate();

    connection_Analytics.query(`
    INSERT INTO T${GuildID} (Date, membercount) VALUES (STR_TO_DATE("${Analyticsdate}", '%d-%m-%Y'), "${membercount}" )
    ON DUPLICATE KEY UPDATE membercount = "${membercount}"
    `,
    function(err, result, field){
        if(err){console.error(err)}
        else if(result){
        }
    })
}
module.exports.Push_AnalyticsData_membercount = Push_AnalyticsData_membercount;

*/