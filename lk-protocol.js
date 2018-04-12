var server = require ('tk102');
var mysql = require('mysql');
var con = mysql.createConnection({
    host: "localhost",
    user: "azolla",
    password: "Azolla135246",
    database: "gps"
});

con.connect(function(err) {
    if (err) throw err;

    // start server
    server.createServer ({
        port: 40000
    });

    server.on ('data', function (raw) {
        console.log ('Incoming data: '+ raw);
        var sql = "INSERT INTO gps_raw (raw) VALUES (?)";
        con.query(sql, [raw], function (err, result) {
            if (err) throw err;
            console.log("1 record inserted");
        });
    });

    server.on ('track', function (gps) {
        var columns = gps.raw.split(",");
        var device_id = columns[1];

        var sql = "INSERT INTO gps_data (device_id, latitude_final, longitude_final, datetime) VALUES (?, ?, ?, ?)";
        con.query(sql, [device_id, gps.geo.latitude, gps.geo.longitude, gps.datetime], function (err, result) {
            if (err) throw err;
            console.log("1 record inserted");
        });
        // { raw: '1203301642,0031698765432,GPRMC,144219.000,A,5213.0327,N,00516.7759,E,0.63,179.59,300312,,,A*6D,F,imei:123456789012345,123',
        //   datetime: '2012-03-30 16:42',
        //   phone: '0031698765432',
        //   gps: { date: '2012-03-30', time: '14:42:19.000', signal: 'full', fix: 'active' },
        //   geo: { latitude: 52.130326, longitude: 5.167759, bearing: 179 },
        //   speed: { knots: 0.63, kmh: 1.167, mph: 0.725 },
        //   imei: '123456789012345' }
    });

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
