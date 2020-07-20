const xmlbuilder = require('xmlbuilder');
const notificationCodes = require('/src/settings/pns-constants.js').notification_codes;

function generateLocKey(eventType, subEvent){
	let template = '';	
	let eventTypeAndSubEvent = `${eventType} ${subEvent || ""}`;
	let eventTypeAndSubEventPascalCase = ucwords( eventTypeAndSubEvent.replace(/_/g, ' ').toLowerCase() ).replace(/ /g, '');
	
	switch (eventType) {
		case "FLIGHTSTATS_ALERT" :
		case "EXPENSE_STATEMENT" :
		case "UPLOAD_RECEIPT" :
			template = `Notification${eventTypeAndSubEventPascalCase}Key`;
			break;

		default:
			template = `NotificationBooking${eventTypeAndSubEventPascalCase}Key`;
	}
	
	return template;
}

exports.createIosNotification = function(/** {Object} */ msg ){
	let event = msg.body;
	let payload = msg.body.payload || null;
    let eventType = msg.body.eventType;
    let subEvent = payload ? payload.event : null;
	let aps = {
		alert: {}
    };
	
	if( msg.body.eventDescription ){
		aps.alert = event.eventDescription;
		aps.alert["loc-key"] ? aps.alert["loc-key"] = generateLocKey(eventType, subEvent || null) : delete aps.alert["loc-key"];
        aps.alert["mutable-content"] ? (aps["mutable-content"] = 1, delete aps.alert["mutable-content"]) : delete aps.alert["mutable-content"];
        aps.alert.category ? (aps.category = aps.alert.category, delete aps.alert.category) : null;
	} else {
		let localizedStringKey = generateLocKey(eventType, subEvent || null);
		
		aps.alert = {
			...(localizedStringKey && {"loc-key": localizedStringKey}),
			...(event.args && {"loc-args": event.args.arg}),
		};
	};

    // for fetching data in backgroud
    aps["content-available"] = 1;
    
    return {
          aps : aps,
          payload : event.payload
    };
};

/**
 * @return {String} xml
 */

exports.createXmlNotification = function(/** {Object} */ msg ){
    var eventType = msg.body.eventType
        , data = {}
        , messageCode = get_code_for_notification_code(eventType);
        
    if( msg.body.eventDescription ){
        // description as exact message
        data.message = msg.body.eventDescription;
        delete msg.body.eventDescription;
    }else{
        data.message = eventType;
    }
    data['message-code'] = messageCode;
    
    union( data, msg.body );

    var xmlMsg =  xmlbuilder.create('notification')

    obj2xmlfragment(xmlMsg, data);

    return xmlMsg.end().toString();
};

exports.createXmlDocument = function(/** {Object} */ msg, /** {String} */ rootNode ){
    var xmlBuilder = xmlbuilder.create(rootNode);

    obj2xmlfragment( xmlBuilder, msg );

    return xmlBuilder.end().toString();
}

function obj2xmlfragment( node, obj ){
    var empty = function(val){
            return val === '' || typeof val == 'undefined' || val === null
        }
        , processArray = function(node, array, nodeName){
            //console.log('process array');
            for (var i = 0, len = array.length; i < len; i++) {

                if( empty(array[i]) ) continue;

                var arr_sub_node = node.element( nodeName || "element_"+i );
                obj2xmlfragment(arr_sub_node, array[i]);
            }
        };

    //console.log( 'obj2xmlfragment: input object : ' );
    //console.log( JSON.stringify(obj, null, 4) );

    switch (true){
         // multiply element with name attr for each element in the array
        case obj instanceof Array :
            //console.log('not supported');
            processArray(node, obj);
            break;
    
        // one element for nonArray object or simple value
    
        case  obj instanceof Object :
            //console.log('process object');
            for ( var attr in obj ){
                //console.log( 'obj2xmlfragment: for attribute "' + attr +'" ...');

                var val = obj[attr];

                if( empty(val) ) continue;
                
                if (val instanceof Array) {
                    processArray(node, val, attr);
                }else{
                    var subNode  =  node.element( attr );
                    obj2xmlfragment( subNode, val );
                }
            }
            break;
        
        default:
            //console.log('process simple value');
            //console.log( 'obj2xmlfragment: simple text element with text:"'+obj+'"');
            node.text( obj );
    }
}

/**
 * Merge object `b` with `a` giving precedence to
 * values in object `a`.
 *
 * @param {Object} a
 * @param {Object} b
 * @return {Object} a
 * @api private
 */
 
function union(a, b){
  if (a && b) {
    var keys = Object.keys(b)
      , len = keys.length
      , key;
    for (var i = 0; i < len; ++i) {
      key = keys[i];
      if (!a.hasOwnProperty(key)) {
        a[key] = b[key];
      }
    }
  }
  return a;
};

exports.union = union;

function ucwords (str) {
    // Uppercase the first character of every word in a string  
    // 
    // version: 1109.2015
    // discuss at: http://phpjs.org/functions/ucwords    // +   original by: Jonas Raoni Soares Silva (http://www.jsfromhell.com)
    // +   improved by: Waldo Malqui Silva
    // +   bugfixed by: Onno Marsman
    // +   improved by: Robin
    // +      input by: James (http://www.james-bell.co.uk/)    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // *     example 1: ucwords('kevin van  zonneveld');
    // *     returns 1: 'Kevin Van  Zonneveld'
    // *     example 2: ucwords('HELLO WORLD');
    // *     returns 2: 'HELLO WORLD'
    return (str + '').replace(/^([^\s])|\s+([^\s])/g, function ($1) {
        return $1.toUpperCase();
    });
}

/**
 * generata UUID v4 ( random )
 *
 * @return {String}
 */

exports.generateUUID = function(a,b){for(b=a='';a++<36;b+=~a%5|a*3&4?(a^15?8^Math.random()*(a^20?16:4):4).toString(16):'-');return b}

/**
 * Extracts event data in proper format
 *
 * @param {Object} timestamp
 */

function getTimestamp() {
    var timestamp = new Date();

    timestamp.setMilliseconds(0);

    return timestamp.toISOString();
}

function get_code_for_notification_code(code){
    if( code ){
        return notificationCodes[code.toUpperCase()];
    }else{
        return "";
    }
}