var gps = require("gps-tracking");
let date = require('date-and-time');
var mysql = require('mysql');
var moment = require('moment-timezone');
var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "rts123",
    database: "gps"
});

var options = {
    'debug'                 : true,
    'port'                  : 40000,
    'device_adapter'        : require("./lk109.js")
}

function toTimeZone(time, zone) {
    var format = 'YYYY-MM-DD HH:mm:ss';
    return moment(time, format).tz(zone).format(format);
}

con.connect(function(err) {
    if (err) throw err;

    var server = gps.server(options,function(device,connection){

        device.on("login_request",function(device_id,msg_parts){

            // Some devices sends a login request before transmitting their position
            // Do some stuff before authenticate the device...

            // Accept the login request. You can set false to reject the device.
            this.login_authorized(true);

        });

        //PING -> When the gps sends their position
        device.on("ping",function(data){

            //After the ping is received, but before the data is saved
            console.log(data);

            var sql = "INSERT INTO gps_raw (raw) VALUES (?)";
            con.query(sql, [data.raw], function (err, result) {
                if (err) throw err;
                console.log("1 record inserted");
            });

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
            var datetime = toTimeZone(date_final + ' ' + time_final, 'Asia/Hong_Kong');

            // console.log(datetime);

            var sql = "INSERT INTO `gps_data` (device_id, latitude, latitude_logo, latitude_final, longitude, longitude_logo, longitude_final, datetime, is_valid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
            con.query(sql, [data.device_id, latitude, latitude_logo, latitude_final, longitude, longitude_logo, longitude_final, datetime, data.validity], function (err, result) {
                if (err) throw err;
                console.log("1 record inserted");
            });

            return data;

        });

        device.on('end', () => {
            console.log('end');
        });

        device.on('close', () => {
            console.log('close');
        });

        device.on('timeout', () => {
            console.log('timeout');
        });

        device.on('drain', () => {
            console.log('drain');
        });

    });

});
