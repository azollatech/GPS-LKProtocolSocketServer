var gpsServer = require('gps-server');
let date = require('date-and-time');
var mysql = require('mysql');
var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "rts123",
    database: "gps"
});

function toTimeZone(time, zone) {
    var format = 'YYYY-MM-DD HH:mm:ss';
    return moment(time, format).tz(zone).format(format);
}

con.connect(function(err) {
    if (err) throw err;

    // start server
    server.createServer ({
        port: 40000
    });

    server.on ('data', function (raw) {
        console.log ('Incoming data: '+ raw);

        var array = raw.split(',');
        if (array.length > 3) {
            var device_id = array[1];
            var command = array[2];
        } else {
            return;
        }

        if (command == 'V1') {

            var sql = "INSERT INTO gps_raw (raw) VALUES (?)";
            con.query(sql, [raw], function (err, result) {
                if (err) throw err;
                console.log("1 record inserted");
            });

            var validity = array[4];

            var latitudeRaw = array[5];
            var latitudeDigit = parseFloat(latitudeRaw.substring(0, 2));
            var latitudeDecimal = parseFloat(latitudeRaw.substring(2)) / 60;
            var latitude = latitudeDigit + latitudeDecimal;
            var latitude_logo = array[6];
            var latitude_final = ((latitude_logo == 'N') ? 1 : -1) * latitude;

            var longitudeRaw = array[7];
            var longitudeDigit = parseFloat(longitudeRaw.substring(0, 3));
            var longitudeDecimal = parseFloat(longitudeRaw.substring(3)) / 60;
            var longitude = longitudeDigit + longitudeDecimal;
            var longitude_logo = array[8];
            var longitude_final = ((longitude_logo == 'E') ? 1 : -1) * longitude;

            var dateObj = date.parse(array[11], 'DDMMYY');
            var date_final = date.format(dateObj, 'YYYY-MM-DD');
            var timeObj = date.parse(array[3], 'HHmmss');
            var time_final = date.format(timeObj, 'HH:mm:ss');
            var datetime = toTimeZone(date_final + ' ' + time_final, 'Asia/Hong_Kong');

            // console.log(datetime);

            var sql = "INSERT INTO gps_data (device_id, latitude, latitude_logo, latitude_final, longitude, longitude_logo, longitude_final, datetime) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
            con.query(sql, [device_id, latitude, latitude_logo, latitude_final, longitude, longitude_logo, longitude_final, datetime], function (err, result) {
                if (err) throw err;
                console.log("1 record inserted");
            });
        }

    });

    // server.on ('track', function (gps) {
        // var columns = gps.raw.split(",");
        // var device_id = columns[1];
        //
        // var sql = "INSERT INTO gps_data (device_id, latitude_final, longitude_final, datetime) VALUES (?, ?, ?, ?)";
        // con.query(sql, [device_id, gps.geo.latitude, gps.geo.longitude, gps.datetime], function (err, result) {
        //     if (err) throw err;
        //     console.log("1 record inserted");
        // });
        // { raw: '1203301642,0031698765432,GPRMC,144219.000,A,5213.0327,N,00516.7759,E,0.63,179.59,300312,,,A*6D,F,imei:123456789012345,123',
        //   datetime: '2012-03-30 16:42',
        //   phone: '0031698765432',
        //   gps: { date: '2012-03-30', time: '14:42:19.000', signal: 'full', fix: 'active' },
        //   geo: { latitude: 52.130326, longitude: 5.167759, bearing: 179 },
        //   speed: { knots: 0.63, kmh: 1.167, mph: 0.725 },
        //   imei: '123456789012345' }
    // });

    server.on ('connection', function (socket) {
      console.log ('Connection from '+ socket.remoteAddress);
    });

    server.on ('disconnect', function (socket) {
      console.log ('Disconnected device '+ socket.remoteAddress);
    });

    server.on ('timeout', function (socket) {
      console.log ('Time-out from '+ socket.remoteAddress);
    });

    server.on ('fail', function (err) {
      console.log (err);
    });

});
