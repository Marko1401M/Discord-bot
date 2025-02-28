const mysql = require('mysql');
module.exports = {addServer, addPlayer, getLeaderboard, linkAccounts,getLolByDiscordId, banWord, getBannedWords, changeLolDetails}
const con = mysql.createConnection(
    {
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,  
    }
);

function addServer(serverId, serverName){
    let sql = `SELECT * from servers where server_id = '${serverId}'`;
    con.query(sql, (err,result,fields) => {
        if(err) throw err;
        if(result.length == 0){
            sql = `INSERT into servers(server_id, server_name) VALUES('${serverId}','${serverName}')`;
            if(err) throw err;
            con.query(sql, (err,result,fields)=>{
                if(err) throw err;
                console.log(`Dodat je server ${serverName}`);
            })
        }
    });
}

function addPlayer(player,serverId){
    let sql = `SELECT * from user where summonerId = '${player.id}'`;
    con.query(sql,(err, result, fields) =>{
        if(err) throw err;
        if(result.length != 0){ //Player already exists in the leaderboard so we have to update his rank and everyhing
            sql = `UPDATE leaderboard set tier = '${player.tier}', rank = '${player.rank}', leaguePoints = '${player.leaguePoints}', totalPoints = '${player.totalPoints}' where summonerId='${player.id}' and server_id = '${serverId}'`;
            con.query(sql,(err,result,fields) => {
                console.log('Updated a player!');
            })
        }
        else{ //Player doesnt exist so we have to add it to both databases
            sql = `INSERT into user(summonerId, tagline, username) VALUES('${player.id}','${player.tagLine}','${player.gameName}')`
            con.query(sql, (err, result, fields) => {
                if(err) throw err;
                console.log(`Added a player: ${player.gameName}#${player.tagLine}`);
                return;
            })
            let sql2 = "INSERT INTO leaderboard (server_id, summonerId, tier, `rank`, leaguePoints, totalPoints) VALUES (?, ?, ?, ?, ?, ?)";
            let values = [serverId, player.id, player.tier, player.rank, player.leaguePoints, player.totalPoints];
            con.query(sql2, values, (err, result, fields) => {
                if (err) throw err;
                console.log('Success!');
            });
        }
    })
}

let name;

async function getNameFromId(playerId){
    let sql = `SELECT * from user where summonerId='${playerId}'`;
    let temp = '';
    return new Promise((resolve, reject)=>{
        con.query(sql, (err, result, fields)=>{
            if(err) throw err;
            if(result.length > 0){
                resolve(result);
            }
            else{
                resolve(null);
            }
        })
    })
    
}

async function getLeaderboard(serverId){
    let sql = `SELECT * from leaderboard where server_id = ${serverId}`;
    return new Promise((resolve, reject)=>{
        con.query(sql, async (err, result, fields) =>{
            let player = [];
            for(let i = 0; i < result.length; i++){
                const name = await getNameFromId(result[i].summonerId);
                player[i] = {
                    username: name[0].username,
                    tagline: name[0].tagline,
                    rank: result[i].rank,
                    tier: result[i].tier,
                    leaguePoints: result[i].leaguePoints,
                    totalPoints: result[i].totalPoints,
                }
            }
            resolve(player);
        })
    })
}

async function linkAccounts(account, discord_id){
    let sql = `SELECT * from linked_accounts where summonerId= '${account.id}' and discordId = '${discord_id}'`;
    return new Promise((resolve, reject)=>{
        con.query(sql, (err, result, fields) =>{
            if(err) throw err;
            console.log(result);
            if(result.length > 0) resolve(false);
            else{
                let sql = `INSERT INTO linked_accounts(summonerId, discordId) VALUES('${account.id}','${discord_id}')`;
                con.query(sql,(err,result,fields)=>{
                    if(err) throw err;
                })
                resolve(true);
            }
        })
    })
}

async function getLolByDiscordId(discord_id){
    let sumId = await getLinkedAccount(discord_id);
    if(sumId == null) return null;
    let user = await getAccountById(sumId);
    return user;
}

async function getAccountById(summonerId){
    let sql = `SELECT * from user where summonerId = '${summonerId}'`;
    return new Promise((resolve, reject)=>{
        con.query(sql, (err, result, fields)=>{
            if(err) throw err;
            if(result.length == 0) resolve(null);
            else {
                const user ={
                    summonerId: result[0].summonerId,
                    gameName: result[0].username,
                    tagLine: result[0].tagline,
                }
                resolve(user);
            }
        })
    })
}

async function getLinkedAccount(discord_id){
    let sql = `SELECT * from linked_accounts where discordId = '${discord_id}'`;
    return new Promise((resolve, reject)=>{
        con.query(sql, (err, result, fields)=>{
            if(err) throw err;
            if(result.length == 0) {
                resolve(null);
            }
            else resolve(result[0].summonerId);
        })
    })
}

async function banWord(word, banned_by = null){
    let sql = `SELECT * from banned_words where content ='${word}'`
    return new Promise((resolve, reject)=>{
        con.query(sql,(err, result, fields)=>{
            if(err) throw err;
            if(result.length > 0) resolve(false);
            else{
                let sql = `INSERT into banned_words(content, banned_by) VALUES ('${word}','${banned_by}')`
                resolve(new Promise((resolve, reject)=>{
                    con.query(sql,(err,result, fields)=>{
                        if(err) throw err;
                        resolve(true);
                    })
                }))
                
            }
        })
    })
}

async function getBannedWords(){
    let sql = `SELECT * from banned_words`;
    return new Promise((resolve, reject)=>{
        con.query(sql,(err, result, fields) =>{
            if(err) throw err;
            resolve(result);
        })
    })
}

async function changeLolDetails(username, tag, discordId){
    let t = await getLinkedAccount(discordId);
    if(t == 0 || t == null) return false;
    console.log(t);
    let sql = `UPDATE user set username="${username}", tagline = "${tag}" where summonerId = "${t}"`;
    con.query(sql,(err, result, fields) => {
        if(err) throw err;
    })
    return true;
}