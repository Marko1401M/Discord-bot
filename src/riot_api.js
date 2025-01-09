const options = {
    method: 'GET',
    headers: {
        'X-Riot-Token': process.env.RIOT_API_KEY
    }
};

module.exports = {getRankedForSummoner, getColor, getMatchHistory, getTotalPoints,sortLeaderboard,getRankedByDiscordId,getSummoner};

const {getLolByDiscordId} = require('./database.js')

async function getLoLAccount(username, tagline){
    const link = `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${username}/${tagline}`;
    const response = await fetch(link, options);
    if(response.status != 200) return null;
    const acc = await response.json();
    return acc;
}

async function getSummoner(username, tagline){
    const user = await getLoLAccount(username, tagline);
    if(user == null) return null;
    const link = `https://eun1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${user.puuid}`;
    const response = await fetch(link, options);
    if(response.status != 200) return null;
    const responseJson = await response.json();
    responseJson.gameName = user.gameName;
    responseJson.tagLine = user.tagLine;
    return responseJson;
}

async function getRankedForSummoner(username, tagline){
    const user = await getSummoner(username, tagline);
    if(user == null) return null;
    const link = `https://eun1.api.riotgames.com/lol/league/v4/entries/by-summoner/${user.id}`;
    const response = await fetch(link, options);
    if(response.status != 200) return null;
    const responseJson = await response.json();
    let rankedSummoner = -1;
    for(let i = 0; i < responseJson.length; i++){
        if(responseJson[i].queueType == 'RANKED_SOLO_5x5'){
            rankedSummoner = {
                gameName: user.gameName,
                tagLine: user.tagLine,
                puuid: user.puuid,
                id: user.id,
                accountId: user.accountId,
                profileIconId: user.profileIconId,
                summonerLevel: user.summonerLevel,
                tier: responseJson[i].tier,
                rank: responseJson[i].rank,
                leaguePoints: responseJson[i].leaguePoints,
                wins: responseJson[i].wins,
                losses: responseJson[i].losses,
            }
        }
    }
    if(responseJson.length == 0){
        rankedSummoner = {
            gameName: user.gameName,
            tagLine: user.tagLine,
            puuid: user.puuid,
            id: user.id,
            accountId: user.accountId,
            profileIconId: user.profileIconId,
            summonerLevel: user.summonerLevel,
            tier: 'UNRANKED',
            rank: 'UNRANKED',
            leaguePoints: '0',
            wins: '0',
            losses: '0',
        }
    }
    return rankedSummoner;
}

async function getMatchIDs(user){
    const link = `https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${user.puuid}/ids`;
    const response = await fetch(link, options);
    if(response.status != 200) return null;
    let data = await response.json();
    return data
}

async function getMatch(id){
    const link = `https://europe.api.riotgames.com/lol/match/v5/matches/${id}`;
    const response = await fetch(link, options);
    if(response.status != 200) return null;
    let match = await response.json();
    return match;
}

async function getMatchHistory(user){
    const matchIds = await getMatchIDs(user);
    if(matchIds == null) return null;
    let stats = [];
    for(let i = 0; i < 5; i++){
        let match = await getMatch(matchIds[i]);
        stats[i] = getStatsFromMatch(user,match);
    }
    return stats;
}

function getStatsFromMatch(user, match){

    for(let player of match.info.participants){
        if(player.puuid == user.puuid){
            return player;
        }
    }
}

function getColor(tier){
    let color = 'Grey';
    if(tier == 'DIAMOND') color = '#506bd1'
    else if(tier == 'PLATINUM') color = 'Aqua'
    else if(tier == 'EMERALD') color = '159a5a'
    else if(tier == 'GOLD') color = 'Gold'
    else if(tier == 'MASTER') color = 'Purple'
    else if(tier == 'SILVER') color = 'LightGrey'
    else if(tier == 'BRONZE') color = '6a4215'
    else if(tier == 'CHALLENGER') color = '#cba06f'
    else if(tier == 'GRANDMASTER') color = 'Red'
    else if(tier == 'UNRANKED') color = 'Grey'
    else color = 'Random'

    return color
}

function getTotalPoints(tier, rank, leaguePoints){
    let points = leaguePoints;
    if(tier == 'IRON') points += 0;
    else if(tier == 'BRONZE') points += 400;
    else if(tier == 'SILVER') points += 800;
    else if(tier == 'GOLD') points += 1200;
    else if(tier == 'PLATINUM') points += 1600;
    else if(tier == 'EMERALD') points += 2000;
    else if(tier == 'DIAMOND') points += 2400;
    else  points += 2800;

    if(rank == 'I') points += 300;
    if(rank == 'II') points += 200;
    if(rank == 'III') points += 100;

    return points;
}

function sortLeaderboard(leaderboard){
    for(let i = 0; i < leaderboard.length - 1; i++){
        for(let j = i+1; j < leaderboard.length; j++){
            if(leaderboard[i].totalPoints < leaderboard[j].totalPoints){
                let temp = leaderboard[i];
                leaderboard[i] = leaderboard[j];
                leaderboard[j] = temp;
            }
        }
    }
}

async function getRankedByDiscordId(discord_id){
    let user = await getLolByDiscordId(discord_id);
    console.log(user);
    let rank = await getRankedForSummoner(user.gameName, user.tagLine);
    console.log('rank:');
    console.log(rank);
    if(rank == null || rank == -1){
        return await getSummoner(user.gameName, user.tagLine);
    }
    console.log(rank);
    return rank;
}