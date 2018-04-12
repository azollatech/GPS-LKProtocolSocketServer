var server = require ('tk102');

// start server
server.createServer ({
    port: 40000
});

// incoming data, i.e. update a map
// server.on ('track', function (gps) {
//   updateMap (gps.geo.latitude, gps.geo.longitude);
// });

server.on ('data', function (raw) {
    console.log ('Incoming data: '+ raw);
});
