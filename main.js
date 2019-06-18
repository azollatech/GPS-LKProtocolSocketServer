var gps = require("gps-tracking");
let date = require('date-and-time');
var mysql = require('mysql');
var moment = require('moment-timezone');
var db_config = {
    connectionLimit : 5000,
    host            : 'localhost',
    user            : 'root',
    password        : 'rts123',
    database        : 'gps'
}
var options = {
    'allowHalfOpen'         : true,
    'debug'                 : true,
    'port'                  : 40000,
    'device_adapter'        : require("./lk109.js")
}

// Log to a file and console screen
var fs = require('fs');
var util = require('util');
var log_file = fs.createWriteStream(__dirname + '/debug.log', {flags : 'a'});
var log_stdout = process.stdout;

console.log = function(d) { //
  log_file.write(util.format(d) + '\n');
  log_stdout.write(util.format(d) + '\n');
};

function toTimeZone(time, zone) {
    var format = 'YYYY-MM-DD HH:mm:ss';
    return moment.utc(time, format).tz(zone).format(format);
}

var pool  = mysql.createPool(db_config);

// function handleDisconnect() {
//     con = mysql.createConnection(db_config); // Recreate the connection, since
//     // the old one cannot be reused.
//
//     con.connect(function(err) {              // The server is either down or restarting (takes a while sometimes).
//         if(err) {
//             console.log('error when connecting to db:', err);
//             setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
//         }                                       // to avoid a hot loop, and to allow our node script to
//         console.log('connected.');
//     });                                         // process asynchronous requests in the meantime.
//                                                 // If you're also serving http, display a 503 error.
//     con.on('error', function(err) {
//         console.log('db error', err);
//         if(err.code === 'PROTOCOL_CONNECTION_LOST') {   // Connection to the MySQL server is usually
//             handleDisconnect();                         // lost due to either server restart, or a
//         } else {                                        // connnection idle timeout (the wait_timeout
//             throw err;                                  // server variable configures this)
//         }
//     });
// }
// handleDisconnect();

for (var i = 40000; i <= 40005; i++) {
    options['port'] = i;

    var server = gps.server(options,function(device,connection,port){

        device.on("login_request",function(device_id,msg_parts){
            // Some devices sends a login request before transmitting their position
            // Do some stuff before authenticate the device...

            // Accept the login request. You can set false to reject the device.
            this.login_authorized(true);

        });

        //PING -> When the gps sends their position
        device.on("ping",function(data){

            //After the ping is received, but before the data is saved

            // var sql = "INSERT INTO gps_raw (raw) VALUES (?)";
            // con.query(sql, [data.raw], function (err, result) {
            //     if (err) throw err;
            //     console.log("1 record inserted");
            // });

            var validity = data.validity;

            var latitude = data.latitude;
            var latitude_logo = (data.north == '1') ? 'N' : 'S';
            var latitude_final = ((data.north == '1') ? 1 : -1) * latitude;

            var longitude = data.longitude;
            var longitude_logo = (data.east == '1') ? 'E' : 'W';
            var longitude_final = ((data.east == '1') ? 1 : -1) * longitude;

            var dateObj = date.parse(data.date, 'DDMMYY');
            var date_final = date.format(dateObj, 'YYYY-MM-DD');
            var timeObj = date.parse(data.time, 'HHmmss');
            var time_final = date.format(timeObj, 'HH:mm:ss');
            var datetime = date_final + ' ' + time_final;
            datetime = toTimeZone(datetime, 'Asia/Hong_Kong');

            console.log(datetime);

            // read ports/events mapping text file
            fs.readFile('C:/Bitnami/wampstack-5.5.31-0/apache2/htdocs/gps/gps/storage/ports_events_mapping.txt', 'utf8', function(err, mappingJson) {
                var mappingArray = [];
                var isLive = false;

                if (err){
                    console.log(err);
                } else{
                    mappingArray = JSON.parse(mappingJson);
                    isLive = true;
                }

                if (isLive && port in mappingArray) {
                    console.log('=== Live event data (port:'+port+', event_id:'+mappingArray[port]+') ===');

                    var sql = "INSERT INTO `gps_live_" + mappingArray[port] + "`.`raw_data` (device_id, latitude, longitude, datetime, battery_level) VALUES (?, ?, ?, ?, ?)";
                    pool.query(sql, [data.device_id, latitude_final, longitude_final, datetime, data.battery], function (err, mappingJson) {
                        if (err){
                            console.log(err);
                        } else{
                            console.log("1 record inserted");
                        }
                    });
                } else {
                    console.log('=== Archive data (port:'+port+') ===');

                    var sql = "INSERT INTO `gps`.`raw_data` (device_id, latitude, longitude, datetime, battery_level, event_id) VALUES (?, ?, ?, ?, ?, ?)";
                    pool.query(sql, [data.device_id, latitude_final, longitude_final, datetime, data.battery, mappingArray[port]], function (err, result) {
                        if (err){
                            console.log(err);
                        } else{
                            console.log("1 record inserted");
                        }
                    });
                }
            });

            // var sql = "INSERT INTO `gps_data` (device_id, latitude, latitude_logo, latitude_final, longitude, longitude_logo, longitude_final, datetime, is_valid, battery_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            // pool.query(sql, [data.device_id, latitude, latitude_logo, latitude_final, longitude, longitude_logo, longitude_final, datetime, data.validity, data.battery], function (err, result) {
            //     if (err) throw err;
            //     console.log("1 record inserted");
            // });

            return data;

        });

        //PING -> When the gps sends their position
        device.on("ping_GL300M",function(data){

            //After the ping is received, but before the data is saved

            // var sql = "INSERT INTO gps_raw (raw) VALUES (?)";
            // con.query(sql, [data.raw], function (err, result) {
            //     if (err) throw err;
            //     console.log("1 record inserted");
            // });

            var validity = data.validity;

            var latitude_final = data.latitude;

            var longitude_final = data.longitude;

            if (data.date.length != 8 || data.time.length != 6 || latitude_final == "0.000000" || longitude_final == "0.000000") {
                return data;
            }
            var dateObj = date.parse(data.date, 'YYYYMMDD');
            var date_final = date.format(dateObj, 'YYYY-MM-DD');
            var timeObj = date.parse(data.time, 'HHmmss');
            var time_final = date.format(timeObj, 'HH:mm:ss');
            var datetime = date_final + ' ' + time_final;
            datetime = toTimeZone(datetime, 'Asia/Hong_Kong');

            console.log(datetime);

            // read ports/events mapping text file
            fs.readFile('C:/Bitnami/wampstack-5.5.31-0/apache2/htdocs/gps/gps/storage/ports_events_mapping.txt', 'utf8', function(err, mappingJson) {
                var mappingArray = [];
                var isLive = false;

                if (err){
                    console.log(err);
                } else{
                    mappingArray = JSON.parse(mappingJson);
                    isLive = true;
                }

                if (isLive && port in mappingArray) {
                    console.log('=== Live event data (port:'+port+', event_id:'+mappingArray[port]+') ===');

                    var sql = "INSERT INTO `gps_live_" + mappingArray[port] + "`.`raw_data` (device_id, latitude, longitude, datetime, battery_level) VALUES (?, ?, ?, ?, ?)";
                    pool.query(sql, [data.device_id, latitude_final, longitude_final, datetime, data.battery], function (err, mappingJson) {
                        if (err){
                            console.log(err);
                        } else{
                            console.log("1 record inserted");
                        }
                    });
                } else {
                    console.log('=== Archive data (port:'+port+') ===');

                    var sql = "INSERT INTO `gps`.`raw_data` (device_id, latitude, longitude, datetime, battery_level, event_id) VALUES (?, ?, ?, ?, ?, ?)";
                    pool.query(sql, [data.device_id, latitude_final, longitude_final, datetime, data.battery, mappingArray[port]], function (err, result) {
                        if (err){
                            console.log(err);
                        } else{
                            console.log("1 record inserted");
                        }
                    });
                }
            });

            // var sql = "INSERT INTO `gps_data` (device_id, latitude, latitude_logo, latitude_final, longitude, longitude_logo, longitude_final, datetime, is_valid, battery_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            // pool.query(sql, [data.device_id, latitude, latitude_logo, latitude_final, longitude, longitude_logo, longitude_final, datetime, data.validity, data.battery], function (err, result) {
            //     if (err) throw err;
            //     console.log("1 record inserted");
            // });

            return data;

        });

        connection.on('end', () => {
            console.log('end');
        });

        connection.on('close', () => {
            console.log('close');
        });

        connection.on('timeout', () => {
            console.log('timeout');
        });

        connection.on('drain', () => {
            console.log('drain');
        });

        connection.on('error', function (data) {
            console.log("Connection Error: ");
            console.log(data);
        });

    });
}

// con.connect(function(err) {
//     if (err) throw err;
//
//     var server = gps.server(options,function(device,connection){
//
//         device.on("login_request",function(device_id,msg_parts){
//
//             // Some devices sends a login request before transmitting their position
//             // Do some stuff before authenticate the device...
//
//             // Accept the login request. You can set false to reject the device.
//             this.login_authorized(true);
//
//         });
//
//         //PING -> When the gps sends their position
//         device.on("ping",function(data){
//
//             //After the ping is received, but before the data is saved
//             console.log(data);
//
//             var sql = "INSERT INTO gps_raw (raw) VALUES (?)";
//             con.query(sql, [data.raw], function (err, result) {
//                 if (err) throw err;
//                 console.log("1 record inserted");
//             });
//
//             var validity = data.validity;
//
//             var latitude = data.latitude;
//             var latitude_logo = (data.north == '1') ? 'N' : 'S';
//             var latitude_final = ((data.north == '1') ? 1 : -1) * latitude;
//
//             var longitude = data.longitude;
//             var longitude_logo = (data.east == '1') ? 'E' : 'W';
//             var longitude_final = ((data.east == '1') ? 1 : -1) * longitude;
//
//             var dateObj = date.parse(data.date, 'DDMMYY');
//             var date_final = date.format(dateObj, 'YYYY-MM-DD');
//             var timeObj = date.parse(data.time, 'HHmmss');
//             var time_final = date.format(timeObj, 'HH:mm:ss');
//             var datetime = date_final + ' ' + time_final;
//             var datetime = toTimeZone(date_final + ' ' + time_final, 'Asia/Hong_Kong');
//
//             // console.log(datetime);
//
//             var sql = "INSERT INTO `gps_data` (device_id, latitude, latitude_logo, latitude_final, longitude, longitude_logo, longitude_final, datetime, is_valid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
//             con.query(sql, [data.device_id, latitude, latitude_logo, latitude_final, longitude, longitude_logo, longitude_final, datetime, data.validity], function (err, result) {
//                 if (err) throw err;
//                 console.log("1 record inserted");
//             });
//
//             return data;
//
//         });
//
//         device.on('end', () => {
//             console.log('end');
//         });
//
//         device.on('close', () => {
//             console.log('close');
//         });
//
//         device.on('timeout', () => {
//             console.log('timeout');
//         });
//
//         device.on('drain', () => {
//             console.log('drain');
//         });
//
//     });
//
// });
