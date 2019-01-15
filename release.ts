/*
██████╗ ██╗   ██╗██████╗ ██╗     ██╗ ██████╗    ████████╗██████╗  █████╗  ██████╗██╗  ██╗███████╗██████╗
██╔══██╗██║   ██║██╔══██╗██║     ██║██╔════╝    ╚══██╔══╝██╔══██╗██╔══██╗██╔════╝██║ ██╔╝██╔════╝██╔══██╗
██████╔╝██║   ██║██████╔╝██║     ██║██║            ██║   ██████╔╝███████║██║     █████╔╝ █████╗  ██████╔╝
██╔═══╝ ██║   ██║██╔══██╗██║     ██║██║            ██║   ██╔══██╗██╔══██║██║     ██╔═██╗ ██╔══╝  ██╔══██╗
██║     ╚██████╔╝██████╔╝███████╗██║╚██████╗       ██║   ██║  ██║██║  ██║╚██████╗██║  ██╗███████╗██║  ██║
╚═╝      ╚═════╝ ╚═════╝ ╚══════╝╚═╝ ╚═════╝       ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝



               Install modules
----------------------------------------------
- Open cmd, locate to nrelay folder & type:  -
- npm install moment                         -
- npm install discord.js                     -
----------------------------------------------
*/

import { Library, PacketHook, Client, NewTickPacket, Classes, UpdatePacket } from '..';
import { TextPacket } from '../networking/packets/incoming/text-packet';
import { PlayerTracker } from './../stdlib/player-tracker';
import { WorldPosData } from './../networking/data/world-pos-data';

const Discord = require('discord.js');
const moment = require('moment');

/*Walk Positions, (x, y)*/
const realms = new WorldPosData(134, 109);   //update coordinates, walk straight up from nexus to middle of realmportals, and type /pos or /loc
const nexus = new WorldPosData(133, 142);    //update coordinates, enter nexus && type /pos or /loc
const COOLDOWN = 200 * 1000;                 //cooldown that bot will wait to walk up again for new realm portal info

/*Bazaar Positions, (x, y)*/
const leftbaz = new WorldPosData(106, 182);  //walk ontop of left bazaar portal and type /pos or /loc
const rightbaz = new WorldPosData(148, 182); //walk ontop of right bazaar portal and type /pos or /loc

/*json*/
const fs = require("fs");
const cfg = JSON.parse(fs.readFileSync("./cfg.json"));

/*Embed pic urls, crop pic to 42x42, upload to some site and put the url in.*/
///REPLACE WITH BETTER SOLUTION IF NOT LAZY\\\
const list = [
 { group: "mch", embedTitle: "Marble Core Hunters", picUrl: " " }, //e.g  { group: "mch", embedTitle: "Marble Core Hunters", picUrl: "i.imgur.com/549838953498" }
 { group: "fametrainer", embedTitle: "FameTrainer", picUrl: " " },
 { group: "sbc", embedTitle: "Spooky Boy Central", picUrl: " " },
 { group: "dungunity", embedTitle: "Dungeon Unity", picUrl: " " },
 { group: "pubhalls", embedTitle: "Public Lost Halls", picUrl: " " },
 { group: "pubshat", embedTitle: "Public Shatters", picUrl: " " },
 { group: "lostboys", embedTitle: "Lost Boys", picUrl: " " },
 { group: "dungeoneer", embedTitle: "Dungeoneers", picUrl: " " },
 { group: "ndf", embedTitle: "Nexus Defence Force", picUrl: " " },
];
function getEmbedUrl(name: string/*,title?:string)*/) {
 return list.find(str => str.group.toLowerCase() === name.toLowerCase()).picUrl;
}
function getEmbedTitle(type: string) {
 return list.find(str => str.group.toLowerCase() === type.toLowerCase()).embedTitle;
}
//You can merge these 2 if you wish, with a IF statement.
/* if (name != "") {
  return list.find(str => str.group.toLowerCase() === name.toLowerCase()).url;
 } else if (name == "" && title != "") {
  return list.find(str => str.group.toLowerCase() === type.toLowerCase()).title;
 }*/
//getEmbedUrl(str) <- url || getEmbedUrl("", str) <- embed title

const DUNGEON_REGEX = /^{"key":"server.dungeon_opened_by","tokens":{"dungeon":"(\S.*)", "name":"(\w+)"}}$/;
let someChannel: any;

@Library({
 name: 'Tracker',
 author: 'Crinx'
})

class Tracker {

 private dates: {
  [guid: string]: number
 };
 private count: {
  [server: string]: number
 };
 private ignored: {
  [guid: string]: boolean
 };
 private bot = Discord.Client;
 private threshold: number = 8;

 REALMPORTAL_REGEX = /NexusPortal.(.+) \((\d+)\/85\)/;

 constructor(pt: PlayerTracker) {
  this.dates = {};
  this.ignored = {};
  this.count = {};

  /*dcord*/
  this.bot = new Discord.Client;
  this.bot.login('bot token') //<-- Change

  this.bot.on('ready', () => {
   someChannel = this.bot.channels.get('channelid') // <<-- put any channelid in your server in there (used to get roles)
  });

  this.bot.on('disconnect', function (e: any) {
   console.log(e);
   this.bot.destroy().then(this.bot.login.bind(this.bot));
  });

  this.bot.on('message', (msg: any) => {
   let whitelist: RegExpExecArray = RegExp(/^!white (\w+) (\w+)$/).exec(msg.content);
   if (whitelist /* && msg.channels.id ==*/) {
    if (cfg.players.find((obj: any) => obj.name.toLowerCase() == whitelist[1].toLowerCase()) == null) {
     cfg.players.push({ name: whitelist[1], type: whitelist[2], addedBy: msg.author.tag, addTime: new Date().getTime() });
     if (cfg.players.find((obj: any) => obj.name.toLowerCase() == whitelist[1].toLowerCase()) == null)
      cfg.players.push({ name: whitelist[1], type: whitelist[2] });
     fs.writeFileSync("./cfg.json", JSON.stringify(cfg));
     console.log("whitelisted " + whitelist[1] + " as " + whitelist[2] + " by " + msg.author.tag)
     msg.channel.send('`Added` ' + '**' + whitelist[1] + '**' + ' `to the tracking list as` **' + whitelist[2] + '**');
    }
    else msg.channel.send('**' + whitelist[1] + '**' + ' `is already on the list.`');
   }
  });
  /**/
  Client.on("ready", (client) => this.dates[client.guid] = 0)


  /*tracker enter*/
  pt.on('enter', (player) => {
   let trackedPlayer = cfg.players.find((config: any) => config.name.toLowerCase() == player.name.toLowerCase());
   if (trackedPlayer != null) {
    const type: string = trackedPlayer.type;
    const roles: any = someChannel.guild.roles;
    const playerRole = roles.find((role: any) => role.name.toLowerCase() === type.toLowerCase());

    this.bot.channels.get('channelid').send('`[' + moment().format('LT') + ']` ' + playerRole + ' __**' + player.name + '**__ `entered` __**' + player.server + '**__') //<-- Change channelid
    console.log(player.name + " entered " + player.server)
   }
  });

  /*tracker leave*/
  pt.on('leave', (player, client: Client) => {
   let trackedPlayer = cfg.players.find((config: any) => config.name.toLowerCase() == player.name.toLowerCase());

   /*bazaar*/
   let bazSide = '';
   if (player.worldPos.squareDistanceTo(leftbaz) < 10) {
    bazSide = 'Left Bazaar';
   } else if (player.worldPos.squareDistanceTo(rightbaz) < 10) {
    bazSide = 'Right Bazaar';
   }

   if (bazSide != '' && trackedPlayer != null) {
    const type: string = trackedPlayer.type.toLowerCase();
    this.printEmbed("channelId", `__**${player.name}**__ \`left\` __**${player.server}**__ \`near\` **${bazSide}**`, getEmbedUrl(type), getEmbedTitle(type)) //<-- Change channelid
    console.log(player.name + " left " + player.server + " near " + bazSide)
   }

   /*realms*/
   let exitPoint = '';
   let pop: number;
   client.realms.forEach((x: any) => {
    if (player.worldPos.squareDistanceTo(x.pos as WorldPosData) < 10) {
     exitPoint = x.name;
     pop = x.players;
    }
   });

   if (exitPoint != '') {
    if (trackedPlayer != null) {
     const type: string = trackedPlayer.type.toLowerCase();
     this.printEmbed("channelId", `__**${player.name}**__ entered __**${player.server} ${exitPoint} [${pop}/85]**__`, getEmbedUrl(type), getEmbedTitle(type)) //<-- Change channelid
     console.log(type + " " + player.name + " entered " + player.server + " " + exitPoint + ' [' + pop + '/85] ');

    } else if (player.currentFame >= 15000) {
     const urlStr = "https://imagizer.imageshack.com/v2/42x42q90/924/wnMRTw.png";
     const embedType = "Over 15k Charfame";

     this.printEmbed("channelId", `__**${player.name} (${Math.round(player.currentFame / 1000 * 10) / 10}k BF)**__ entered __**${player.server} ${exitPoint} [${pop}/85]`, urlStr, embedType) //<-- Change channelid
     console.log(player.name + ' (' + Math.round(player.currentFame / 1000 * 10) / 10 + 'k BF)' + ' `entered` ' + player.server + ' ' + exitPoint + ' [' + pop + '/85]');
    }
   }
  });
 }

 /*Keypops.*/
 @PacketHook()
 ONTEXT(nrelayClient: Client, TEXT_: TextPacket): void {
  const match = DUNGEON_REGEX.exec(TEXT_.text);
  if (match && TEXT_.recipient == '') {
   const portalName = match[1];
   this.bot.channels.get('channelid').send('`[' + moment().format('LT') + ']` ' + ' **' + portalName + '**' + ' `opened in` **' + nrelayClient.server.name + '**') //<-- Change channelid
    .then(function (msg: any) {
     setTimeout(() => {
      msg.edit(msg.content + ` | **(closing)**`);
     }, 25000);
     setTimeout(() => {
      msg.delete();
     }, 30000);
    });
  }
 }

 /*Loop to walk to realm portals to call update.*/
 @PacketHook()
 onNewTick(client: Client, ntick: NewTickPacket): void {
  if (Date.now() - this.dates[client.guid] > COOLDOWN) {
   client.nextPos.push(realms);
   this.dates[client.guid] = Date.now();
  } else if (client.worldPos.squareDistanceTo(realms) < 3) {
   client.nextPos[0] = nexus
  }
 }

 /*Realmportal shit*/
 @PacketHook()
 onUPDATE(client: Client, updatepacket: UpdatePacket): void {
  for (let newObjs of updatepacket.newObjects) {
   if (newObjs.objectType === 1810) {
    const stat = newObjs.status.stats.filter((s) => s.statType === 31)[0];
    const portalData = this.REALMPORTAL_REGEX.exec(stat.stringStatValue);
    if (client.realms.length > 0) {
     client.realms.forEach(realm => {
      const newrealmname = portalData[1].split(" ")[0]
      if (realm.name === newrealmname) {
       client.realms = client.realms.filter(obj => obj !== realm);
      }
     });
    }
    client.realms.push({
     name: portalData[1].split(" ")[0],
     pos: newObjs.status.pos,
     objid: newObjs.status.objectId,
     players: +portalData[2]
    });
   }
  }

  /*Playerwave*/
  for (const obj of updatepacket.newObjects) {
   if (Classes[obj.objectType] && this.ignored[client.guid]) {
    if (!this.count[client.guid]) {
     this.count[client.guid] = 0;
    }
    if (this.count[client.guid] == 0) {
     setTimeout(() => this.count[client.guid] = 0, 2000);
    }
    this.count[client.guid]++;
    if (this.count[client.guid] >= this.threshold) {

     const waveEmbed = new Discord.RichEmbed()
      .setAuthor("Playerwave!", "http://imagizer.imageshack.us/a/img922/345/wrSmeb.png")
      .setColor(0x7B8A89)
      .setDescription('**Playerwave** `in` ' + '__**' + client.server.name + '**__')
      .setThumbnail("http://imagizer.imageshack.us/a/img922/345/wrSmeb.png")
      .setTimestamp()

     this.bot.channels.get('channelid').send(waveEmbed) //<-- Change channelid
     this.count[client.guid] = 0;
    }
   }
  }
  this.ignored[client.guid] = true;
 }

 private printEmbed(channelId: string, content: string, embedUrl: string, embedTitle: string) {
  const embed = new Discord.RichEmbed()
   .setAuthor(embedTitle, embedUrl)
   .setColor(0x0000)
   .setDescription(content)
   .setThumbnail(embedUrl)
   .setTimestamp()
  this.bot.channels.get(channelId).send(embed)
 }
}
