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
    this.first_time = true;

    /*******************************************
    PARSE THE INCOMING STRING FROM THE DECIVE
    You must return an object with a least: device_id, cmd and type.
    return device_id: The device_id
    return cmd: command from the device.
    return type: login_request, ping, etc.
    *******************************************/
    this.parse_data = function (data) {
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
                if (this.first_time) {
        			parts.action = "login_request";
                    this.first_time = false;
                } else {
        			parts.action = "ping";
                }

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

    this.dex_to_degrees = function (dex) {
        return parseInt(dex, 16) / 1800000;
    };

    this.get_ping_data = function (msg_parts) {
        var str = msg_parts.data;

        var data = {
            'date': str.substr(0, 12),
            'latitude': this.dex_to_degrees(str.substr(12, 8)),
            'longitude': this.dex_to_degrees(str.substr(20, 8)),
            'speed': parseInt(str.substr(28, 2), 16),
            'orientation': str.substr(30, 4),
        };

        res = {
            latitude: data.latitude,
            longitude: data.longitude,
            speed: data.speed,
            orientation: data.orientation
        };
        return res;
    };

    /* SET REFRESH TIME */
    this.set_refresh_time = function (interval, duration) {
    };

    /* INTERNAL FUNCTIONS */

    this.send_comand = function (cmd, data) {
        var msg = [cmd, data];
        this.device.send(this.format_data(msg));
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
        str += this.format.end;
        return str;
    };
};
exports.adapter = adapter;
