exports.protocol = 'LK109';
exports.model_name = 'LK109';
exports.compatible_hardware = ['LK109/supplier'];

var adapter = function (device) {
    if (!(this instanceof adapter)) {
        return new adapter(device);
    }

    this.format = {'start': '*', 'end': '#', 'separator': ','};
    this.device = device;
    this.__count = 1;

    /*******************************************
    PARSE THE INCOMING STRING FROM THE DECIVE
    You must return an object with a least: device_id, cmd and type.
    return device_id: The device_id
    return cmd: command from the device.
    return type: login_request, ping, etc.
    *******************************************/
    this.parse_data = function (data) {
        var hexdata = this.bufferToHexString(data);
        console.log('\n');
        console.log(hexdata);

        // real gps data ping
        if (hexdata.substr(0,2) == '24') {
            var parts={
    			"start" 		: hexdata.substr(0,2),
    			"device_id" 	: hexdata.substr(2,10),//mandatory
    			"cmd" 			: 'ping', //mandatory
    			"data" 			: hexdata.substring(12),
                "action"        : 'ping'
    		};
            return parts;
        }

        // ASCII messages
        data = data.toString();
        console.log(data);

        if (data.substr(0,1) != '*' || data.indexOf(',') < 0) {
            var parts={
        		"device_id" 	: 'unrecognized',
        		"cmd" 			: 'unrecognized',
                "action"        : 'other'
            }
            return parts;
        }

        var array = data.split(',');
    	var parts={
    		"start" 		: data.substr(0,1),
    		"device_id" 	: array[1],//mandatory
    		"cmd" 			: array[2], //mandatory
    		"data" 			: data,
    		"finish" 		: data.substr(data.length-1,1)
    	};
    	switch(parts.cmd){
    		case "V1":
    			parts.action = "login_request";
    			break;
    		case "V2":
    			parts.action = "other";
    			break;
    		case "NBR":
    			parts.action = "other";
    			break;
    		default:
    			parts.action = "other";
    	}

    	return parts;
    };
    this.bufferToHexString = function (buffer) {
        var str = '';
        for (var i = 0; i < buffer.length; i++) {
            if (buffer[i] < 16) {
                str += '0';
            }
            str += buffer[i].toString(16);
        }
        return str;
    };
    this.authorize = function () {
        //@TODO: implement this
        // var data = ['HQ', '4106000054', 'I1_2_EN', '130305', '10', '1', '9', 'test12345'];
        // console.log(this.format_data(data));
        // this.device.send(this.format_data(data));
    };
    this.synchronous_clock = function () {
        //@TODO: implement this
    };
    this.run_other = function (cmd, msg_parts) {
        switch (cmd) {
            case 'BP00': //Handshake
            this.device.send(this.format_data(this.device.uid + 'AP01HSO'));
            break;
        }
    };

    this.request_login_to_device = function () {
        //@TODO: Implement this.
    };

    this.receive_alarm = function (msg_parts) {
        //@TODO: implement this
        //My device have no support of this feature
        return alarm;
    };

    this.lat_to_degrees = function (str) {
        var degrees = str.substr(0, 2);
        var minutes = str.substr(2, 2) + '.' + str.substr(4, 4);
        return parseFloat(degrees) + parseFloat(minutes)/60;
    };

    this.lng_to_degrees = function (str) {
        var degrees = str.substr(0, 3);
        var minutes = str.substr(3, 2) + '.' + str.substr(5, 3);
        return parseFloat(degrees) + parseFloat(minutes)/60;
    };

    this.map_battery_level = function (str) {
        switch (str) {
            case '01':
                return '10%';
                break;
            case '02':
                return '20%';
                break;
            case '03':
                return '40%';
                break;
            case '04':
                return '60%';
                break;
            case '05':
                return '80%';
                break;
            case '06':
                return '100%';
                break;
            default:
                return '';
        }
    }

    this.hex2bin = function (n) {
        if(!this.checkHex(n))
            return 0;
        return parseInt(n,16).toString(2)
    }

    this.checkHex = function (n) {
        return/^[0-9A-Fa-f]{1,64}$/.test(n)
    }

    this.get_ping_data = function (msg_parts) {
        var str = msg_parts.data;
        console.log('get_ping_data');

        // var validity = array[4];
        //
        // var latitudeRaw = array[5];
        // var latitudeDigit = parseFloat(latitudeRaw.substring(0, 2));
        // var latitudeDecimal = parseFloat(latitudeRaw.substring(2)) / 60;
        // var latitude = latitudeDigit + latitudeDecimal;
        // var latitude_logo = array[6];
        // var latitude_final = ((latitude_logo == 'N') ? 1 : -1) * latitude;
        //
        // var longitudeRaw = array[7];
        // var longitudeDigit = parseFloat(longitudeRaw.substring(0, 3));
        // var longitudeDecimal = parseFloat(longitudeRaw.substring(3)) / 60;
        // var longitude = longitudeDigit + longitudeDecimal;
        // var longitude_logo = array[8];
        // var longitude_final = ((longitude_logo == 'E') ? 1 : -1) * longitude;
        //
        // var dateObj = date.parse(array[11], 'DDMMYY');
        // var date_final = date.format(dateObj, 'YYYY-MM-DD');
        // var timeObj = date.parse(array[3], 'HHmmss');
        // var time_final = date.format(timeObj, 'HH:mm:ss');
        // var datetime = toTimeZone(date_final + ' ' + time_final, 'Asia/Hong_Kong');

        var info = str.substr(30, 2);
        var binaryInfo = this.hex2bin(info);
        var bit3 = binaryInfo.substr(0, 1);
        var bit2 = binaryInfo.substr(1, 1);
        var bit1 = binaryInfo.substr(2, 1);

        var data = {
            'device_id': msg_parts.device_id,
            'time': str.substr(0, 6),
            'date': str.substr(6, 6),
            'latitude': this.lat_to_degrees(str.substr(12, 8)),
            'north': bit2,
            'longitude': this.lng_to_degrees(str.substr(22, 8)),
            'east': bit3,
            'validity': bit1,
            'battery': this.map_battery_level(str.substr(20, 2)),
            'speed': str.substr(32, 3),
            'orientation': str.substr(35, 3),
        };
        return data;
    };

    /* SET REFRESH TIME */
    this.set_refresh_time = function (interval, duration) {
    };

    /* INTERNAL FUNCTIONS */

    this.send_comand = function (cmd, data) {
        this.device.send(this.format_data(data));
    };
    this.format_data = function (params) {
        /* FORMAT THE DATA TO BE SENT */
        var str = this.format.start;
        if (typeof(params) == 'string') {
            str += params;
        } else if (params instanceof Array) {
            str += params.join(this.format.separator);
        } else {
            throw 'The parameters to send to the device has to be a string or an array';
        }
        // str += this.format.end;
        return str;
    };
};
exports.adapter = adapter;
