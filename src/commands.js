require('dotenv').config();
const {REST, Routes, Application, ApplicationCommand, ApplicationCommandOptionType} = require('discord.js');

const commands = [
    {
        name: 'lol_profile',
        description: 'Displays your Level, Tier and rank in Ranked Solo/Duo.',
        options:[
            {
                name:'username',
                description:'Username from game.',
                type:ApplicationCommandOptionType.String,
                required: true,
            },
            {
                name:'tag',
                description:'Tag from game, eg. #EUNE.',
                type:ApplicationCommandOptionType.String,
                required: true,
            },
        ],
    },
    {
        name: 'lol_match_history',
        description: 'Displays your past 5 matches from League Of Legends.',
        options:[
            {
                name:'username',
                description:'Username from game',
                type:ApplicationCommandOptionType.String,
                required: true,
            },
            {
                name:'tag',
                description:'Tag from game, eg. #EUNE',
                type:ApplicationCommandOptionType.String,
                required: true,
            },
        ],
    },
    {
        name:'leaderboard',
        description:'Displays a leaderboard for the specific server.',
    },
    {
        name:'help',
        description:'Displays all commands.',
    },
    {
        name: 'link_lol_profile',
        description: 'Connects your League Of Legends profile with your Discord account.',
        options:[
            {
                name:'username',
                description:'Username from game.',
                type:ApplicationCommandOptionType.String,
                required: true,
            },
            {
                name:'tag',
                description:'Tag from game, eg. #EUNE.',
                type:ApplicationCommandOptionType.String,
                required: true,
            },
        ],
    },
    {
        name: 'my_profile',
        description: 'Displays your LoL profile, but only if you linked it with command.',
    },
    {
        name: 'ban_word',
        description: 'Adds specified word to ban-list.',
        options:[
            {
                name:'word',
                description:'A word that you want to ban.(Only if Administrator)',
                type:ApplicationCommandOptionType.String,
                required: true,
            }, 
        ],
    },
    
];

const rest = new REST({version: '10'}).setToken(process.env.DISCORD_BOT_TOKEN);

(async() => {
    try{
        console.log('Registering commands');
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.SERVER_ID),
            {
                body:commands
            }
        )
        console.log('Commands registered');
    }
    catch(error){
        console.log(error);
    }
})();