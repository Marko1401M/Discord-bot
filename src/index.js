require('dotenv').config();

const {Client, Partials, IntentsBitField, REST, Routes, ApplicationCommandOptionType, EmbedBuilder, MessageMentions, channelMention,RoleManager, User, GatewayIntentBits,GuildMembers, Options, Colors, SlashCommandSubcommandGroupBuilder, Embed, embedLength} = require('discord.js');

const {getRankedForSummoner, getColor, getMatchHistory, getTotalPoints,sortLeaderboard} = require('./riot_api.js');

const {addServer, addPlayer, getLeaderboard} = require('./database.js');

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildInvites,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.DirectMessages,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.GuildMessageTyping,
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.GuildMember,
        Partials.User,
        Partials.Reaction,
    ]
});

client.login(process.env.DISCORD_BOT_TOKEN);

client.on("ready", (c)=>{
    console.log('Bot is now online');
    const guilds = c.guilds.cache.map(guild=>guild.id)
    console.log(guilds)
    for(let i = 0; i < guilds.length; i++){
        let g = c.guilds.cache.get(guilds[i]);
        addServer(g.id, g.name);
    }
})

client.on('guildMemberAdd', (c) =>{
    const channel = c.guild.channels.cache.get(process.env.TEST_CHANNEL_ID);
    channel.send('Welcome to server ' + c.displayName + '!');
})

client.on('messageCreate', (msg) =>{
    if(msg.author.bot) return;

})

client.on('interactionCreate', async (interaction) =>{
    if(!interaction.isChatInputCommand()) return;
    else if(interaction.commandName == 'lol_profile'){
        const account = await getRankedForSummoner(interaction.options.get('username').value, interaction.options.get('tag').value);
        if(account == null){ 
            interaction.reply('Account does not exist!');
            return;
        }
        account.totalPoints = getTotalPoints(account.tier, account.rank, account.leaguePoints);
        addPlayer(account,interaction.guildId);
        let embedProfile = new EmbedBuilder()
            .setColor('Red')
            .setThumbnail(`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${account.profileIconId}.jpg`)
            .setTitle(`${account.gameName}#${account.tagLine}`)
            .setFields([
                {
                    name:'Level',
                    value: account.summonerLevel + "",
                },
            ])
        let embedRank = new EmbedBuilder()
            .setColor(getColor(account.tier))
            .setThumbnail(`https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/${account.tier.toLowerCase()}.png`)
            .setFields([
                {
                    name:'Tier',
                    value:account.tier,
                },
                {
                    name:'Rank',
                    value:account.rank,
                },
                {
                    name:'Winrate',
                    value: (account.wins / (account.wins + account.losses)) * 100 + "%",
                },
            ])
        interaction.reply({embeds:[embedProfile, embedRank]});
    }
    else if(interaction.commandName == 'lol_match_history'){
        const account = await getRankedForSummoner(interaction.options.get('username').value, interaction.options.get('tag').value);
        if(account == null){
            interaction.reply('Account does not exist!');
            return;
        }
        const matchHistory = await getMatchHistory(account);
        if(matchHistory == null){
            interaction.reply('Error with match history!');
            return;
        }
        let embdeds = [];
        embdeds[0] = new EmbedBuilder()
            .setColor('Red')
            .setThumbnail(`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${account.profileIconId}.jpg`)
            .setTitle(`Match history for ${account.gameName}#${account.tagLine}`)
            .setFields([
                {
                    name:'Level',
                    value: account.summonerLevel + "",
                },
                {
                    name:'Tier',
                    value:account.tier,
                },
                {
                    name:'Rank',
                    value:account.rank,
                },
               
            ])
        for(let i = 0; i < 5; i++){
            let color = 'Grey';
            let title = 'Draw';
            if(matchHistory[i].win){
                color = 'Green';
                title = 'Victory';
            }
            else {
                color = 'Red';
                title = 'Defeat';
            }
            const stats = matchHistory[i].kills + '/' + matchHistory[i].deaths + '/' + matchHistory[i].assists + '';
            embdeds[i + 1] = new EmbedBuilder()
                .setColor(color)
                .setThumbnail(`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${matchHistory[i].championId}.png`)
                .setTitle(matchHistory[i].championName)
                .setFields([{
                    name: title,
                    value: stats,
                },]);
        }
        interaction.reply({embeds:embdeds});
    }
    else if(interaction.commandName == 'leaderboard'){
        const lb = await getLeaderboard(interaction.guildId);
        sortLeaderboard(lb);
        console.log(lb)
        
        let embeds = [];
        for(let i = 0; i < lb.length; i++){
            if(i >= 5) break;
            acc = await getRankedForSummoner(lb[i].username, lb[i].tagline);
            embeds[i] = new EmbedBuilder()
                .setThumbnail(`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${acc.profileIconId}.jpg`)
                .setTitle(`${i + 1}. ${lb[i].username}#${lb[i].tagline}`)
                .setFields([
                    {
                        name: 'Tier',
                        value: acc.tier,
                    },
                    {
                        name:'Rank',
                        value: acc.rank,
                    },
                ])
            
        }
        if(embeds[0] != null) embeds[0].setColor('Gold')
        if(embeds[1] != null) embeds[1].setColor('Grey')
        if(embeds[2] != null) embeds[2].setColor(getColor('BRONZE'))
        
        interaction.reply({embeds:embeds});
    }
})

