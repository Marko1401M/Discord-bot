require('dotenv').config();

const {Client, Partials, IntentsBitField, REST, Routes, ApplicationCommandOptionType, EmbedBuilder, MessageMentions, channelMention,RoleManager, User, GatewayIntentBits,GuildMembers, Options, Colors, SlashCommandSubcommandGroupBuilder, Embed, embedLength, getUserAgentAppendix} = require('discord.js');

const {getRankedForSummoner, getColor, getMatchHistory, getTotalPoints,sortLeaderboard,getRankedByDiscordId, getSummoner} = require('./riot_api.js');

const {addServer, addPlayer, getLeaderboard, linkAccounts, banWord, getBannedWords} = require('./database.js');

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
    for(let i = 0; i < guilds.length; i++){
        let g = c.guilds.cache.get(guilds[i]);
        addServer(g.id, g.name);
    }
})

client.on('guildMemberAdd', (c) =>{
    const channel = c.guild.channels.cache.get(process.env.TEST_CHANNEL_ID);
    channel.send('Welcome to ' + c.guild.name + ' server ' + c.displayName + '!');
})

client.on('messageCreate', (msg) =>{
    if(msg.author.bot) return;
})

client.on('interactionCreate', async (interaction) =>{
    if(!interaction.isChatInputCommand()) return;
    else if(interaction.commandName == 'help'){
        let embed = new EmbedBuilder()
            .setColor('Aqua')
            .setTitle('List of all commands')
            .setFields([
                {
                    name:'/lol_profile',
                    value:'Shows your League Of Legends profile, level and rank.',
                },
                {
                    name:'/lol_match_history',
                    value:'Shows your past 5 matches from League Of Legends.',
                },
                {
                    name:'/leaderboard',
                    value:'Shows top 5 League Of Legends Ranked players from that server.',
                },
                {
                    name:'/link_lol_profile',
                    value:'Links specified account with your Discord account.',
                },
                {
                    name:'/my_profile',
                    value:'Shows your LoL profile, but only if you already linked it.',
                },
            ])
        interaction.reply({embeds:[embed]});
    }
    else if(interaction.commandName == 'lol_profile'){
        console.log(interaction.options.get('username').value + ' ' + interaction.options.get('tag').value)
        let account = await getRankedForSummoner(interaction.options.get('username').value, interaction.options.get('tag').value);
        if(account == null){ 
            interaction.reply('Account does not exist!');
            return;
        }
        if(account.tier == null){
            console.log('acc: ')
            console.log(account);
            account = await getSummoner(interaction.options.get('username').value, interaction.options.get('tag').value)
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
            .setColor('LightGrey')
            .setThumbnail(`https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/${'UNRANKED'}.png`)
            .setFields([
                {
                    name:'Tier',
                    value:'UNRANKED',
                },
                {
                    name:'Rank',
                    value:'UNRANKED',
                },
                {
                    name:'Winrate',
                    value: '/',
                },
            ])
            interaction.reply({embeds:[embedProfile, embedRank]});
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
            .setColor('Blue')
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
        let embeds = [];
        embeds[0] = new EmbedBuilder()
            .setTitle('Top 5 players from ' + interaction.guild.name + ' server')
            .setThumbnail(interaction.guild.iconURL(interaction.guild.icon))
            .setColor('Red')
        for(let i = 0; i < lb.length; i++){
            if(i >= 5) break;
            acc = await getRankedForSummoner(lb[i].username, lb[i].tagline);
            embeds[i + 1] = new EmbedBuilder()
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
        if(embeds[1] != null) embeds[1].setColor('Gold')
        if(embeds[2] != null) embeds[2].setColor('Grey')
        if(embeds[3] != null) embeds[3].setColor(getColor('BRONZE'))
        
        interaction.reply({embeds:embeds});
    }
    else if(interaction.commandName == 'link_lol_profile'){
        const account = await getRankedForSummoner(interaction.options.get('username').value, interaction.options.get('tag').value);
        
        let embed;
        if(account == null){
            embed = new EmbedBuilder()
                .setTitle('Error loading your account :(!')
                .setColor('Red')
        }
        let res = await linkAccounts(account, interaction.user.id);
        if(res){
            embed = new EmbedBuilder()
                .setTitle('Succesfully linked ' + account.gameName + ' with Discord account!')
                .setColor('Green')
        }
        else {
            embed = new EmbedBuilder()
                .setTitle('Account ' + account.gameName + ' is already linked with Discord account!')
                .setColor('Yellow')
        }
        interaction.reply({embeds:[embed]});
    }
    else if(interaction.commandName == 'my_profile'){
        const account = await getRankedByDiscordId(interaction.user.id);
        if(account == null){ 
            interaction.reply('Account does not exist!');
            return;
        }
        if(account.tier == null){
            console.log('acc: ')
            console.log(account);
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
            .setColor('LightGrey')
            .setThumbnail(`https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/${'UNRANKED'}.png`)
            .setFields([
                {
                    name:'Tier',
                    value:'UNRANKED',
                },
                {
                    name:'Rank',
                    value:'UNRANKED',
                },
                {
                    name:'Winrate',
                    value: '/',
                },
            ])
            interaction.reply({embeds:[embedProfile, embedRank]});
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
    else if(interaction.commandName == 'ban_word'){
        if(interaction.member.permissionsIn(interaction.channel).has('ADMINISTRATOR')){
            if(await banWord(interaction.options.get("word").value, interaction.user.id)){
                interaction.reply(`'${interaction.options.get("word").value}' has been added to the ban-list!`);
            }
            else {
                interaction.reply(`${interaction.options.get("word").value} is already banned!`);
            }
        }
    }
})

client.on('messageCreate', async (msg) =>{
    if(msg.author.bot) return;
    if(msg.channel.id != process.env.TEST_CHANNEL_ID) return;
    let bannedWords = await getBannedWords();
    for(let i = 0; i < bannedWords.length; i++){
        let regex = new RegExp(bannedWords[i].content,'i');
        if(regex.test(msg)){
            await msg.reply("That word is banned!");
            msg.delete();
            break;
        }
    }
})

