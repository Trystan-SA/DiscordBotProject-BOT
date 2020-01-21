const Mysql = require('../Mysql');

const main = {

    Configuration: {
        name : "analytics",
        CanBeDeactivated : 'false',
    },

    //Configured command//
    Commands: {
        storemembercount : {
            name: "Store Member Count",
            description:"Store the total member count of the current server (for testing purpose only)",
            aliases: ['StoreMembers', 'StoreMembersCount'],
            usage: '[command name]',
            guildOnly: true,
            cooldown: 5,
            permission: "Admin",
            execute: "StoreMembers",
        }
    },
}

module.exports.main = main;