var moment = require('moment-timezone');

var date_final = '2018-05-12';
var time_final = '08:12:12';

function toTimeZone(time, zone) {
    var format = 'YYYY-MM-DD HH:mm:ss';
    return moment(time, format).tz(zone).format(format);
}

var datetime = toTimeZone(date_final + ' ' + time_final, 'Asia/Hong_Kong');
console.log(datetime);
