'use strict';

//
// Load all needed modules

const Hapi          = require('hapi');
const fs            = require('fs');
const Inert         = require('inert');
const sockjs        = require('sockjs');
const Ping          = require('ping-lite');
const http          = require('http');
const querystring   = require('querystring');

//
// Parameters

const _configPath   = __dirname + '/../config.json';

//
// Load configuration

// If the configuration file does not exists, exit
if (!fs.existsSync(_configPath)) {
    console.error('Missing config file');
    process.exit(1);
}

const _config      = require(_configPath);


//
// Server creation

const server = new Hapi.Server();

//
// SockJS

const sockjs_client = {sockjs_url: "http://cdn.jsdelivr.net/sockjs/1.0.1/sockjs.min.js"}; // TODO : Maybe move this locally beca

// list of all the client needed for broadcasting
var clients = {};

/**
 * Send a message to all the connected clients
 *
 * @param message
 */
function broadcast(message){
    for (var client in clients){
        clients[client].write(JSON.stringify(message));
    }
}

// create the websocket server
var sockjsServer = sockjs.createServer(sockjs_client);

// register events
sockjsServer.on('connection', function(conn) {

    //save new client into list
    clients[conn.id] = conn;

    // on connection close event
    conn.on('close', function() {
        delete clients[conn.id];
    });

});

//
// Ping Monitor

var lastPings = [];
var pingCount = 0; // total pings since last status update

var ping = new Ping(_config.ping.host,{
    interval : _config.ping.interval
});

/**
 * Create a CSV file in the db folder for the actual day.
 * This option can be enabled/disabled in the configuration file
 *
 * @param aMessage
 */
function writeDB(aMessage){
    if(_config.ping.save){
        let time = new Date();
        let filename = time.getFullYear()+'_'+(time.getMonth()+1)+'_'+time.getDate()+'.csv';
        fs.appendFile("./db/"+filename, aMessage+'\r\n');
    }
}

/**
 * Send a status update to an external service
 *
 * @param aPing
 */
function reportPingStatus(aPing){ // TODO : Move this to external module

    // INFO : The service behind this code is not ready yet

    if(!_config.status.enabled){
        return;
    }

    let data = querystring.stringify({
        secret : _config.status.secret,
        ping : aPing
    });

    let options = {
        host : _config.status.host,
        port: 80,
        path : "/update",
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(data)
        }
    };

    var req = http.request(options, function(res) {
        res.setEncoding('utf8');
    });

    req.write(data);
    req.end();

}

/**
 * Save the last ping result in memory for graph population when opening the webpage
 *
 * @param aPing
 * @param aTime
 */
function saveLastPing(aPing,aTime){

    lastPings.push({
        ping : aPing,
        time : aTime
    });

    // only keep 150 ping results
    if(lastPings.length>150){
        lastPings.shift();
    }

    if(_config.status.enabled){
        if(pingCount===_config.status.update){
            reportPingStatus(aPing);
            pingCount = 0;
        }else{
            pingCount++;
        }
    }

}

ping.on('error', function(err) {

    let time = new Date().getTime();

    broadcast({
        result : false,
        host : this._host,
        time : time,
        error : err
    });

    writeDB(time+';false');

    saveLastPing(0,time);

});

ping.on('result', function(ms) {

    let time = new Date().getTime();
    let ping = ms==null ? 0 : ms;

    broadcast({
        result : true,
        host : this._host,
        time : time,
        ping : ping
    });

    writeDB(time+';true;'+ping);

    saveLastPing(ping,time);
});

// start pinging the host
ping.start();

//
// Entry Point

server.register(Inert, function () {

    server.connection({
        address : _config.web.host,
        port: _config.web.port
    });

    server.route([
        {
            method: 'GET',
            path: '/{path*}',
            handler: {
                directory: { path: './web', listing: false, index: true }
            }
        },
        {
            method: 'GET',
            path: '/last',
            handler: function(request, reply){

                reply({
                    result : true,
                    data : lastPings
                });

            }
        }
    ]);

    // add SockJS middleware
    sockjsServer.installHandlers(server.listener, {prefix:'/ws'});

    // start Hapi server
    server.start(function() { console.log('Server running at:', 'http://'+_config.web.host+':'+_config.web.port); });

});

