/**
 * Copyright (c) 2019, KDDI Research, Inc.
 * All rights reserved.
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * 3. The name of the author may not be used to endorse or promote products derived from this software without specific prior written permission.
 * THIS SOFTWARE IS PROVIDED BY THE AUTHOR ``AS IS'' AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


//process.env.NODE_ENV = 'production';
process.env.NODE_ENV = 'development';

if (process.env.NODE_ENV == 'production') {
    console.log("Production Mode");
} else if (process.env.NODE_ENV == 'development') {
    console.log("Development Mode");
}

var fs = require('fs');
var http = require('http');
var express = require('express');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var util = require('util');
var url = require('url');
var ip = require('ip');
//var crypto = require('crypto');
var fileStreamRotator = require('file-stream-rotator');
//var merge = require('merge');
var https = require('https');
var moment = require('moment');
var responder = require('./das/responder');
var resource = require('./das/resource');
var db = require('./das/db_action');
var db_sql = require('./das/sql_action');
var app = express();
var token = require('./das/token');
var timeCheck = require('./das/time-check.js');
var geoLocation = require('geolocation-utils');
var ipRangeCheck = require('ip-range-check');
var ipaddr = require('ipaddr.js');
var pathToRegexp = require('path-to-regexp');

//global.usespid              = '//kddi-research.jp';

var logDirectory = __dirname + '/log';

// ensure log directory exists
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);

// create a rotating write stream
var accessLogStream = fileStreamRotator.getStream({
    date_format: 'YYYYMMDD',
    filename: logDirectory + '/access-%DATE%.log',
    frequency: 'daily',
    verbose: false
});

// setup the logger
app.use(morgan('combined', {stream: accessLogStream}));
//ts_app.use(morgan('short', {stream: accessLogStream}));

var cluster = require('cluster');
var os = require('os');
var cpuCount = os.cpus().length;
var worker = [];
var use_clustering = 1;
var worker_init_count = 0;

console.log('Start DAS server!');

db.connect(usedbhost, 3306, 'root', usedbpass, function (rsc) {
    if (rsc == '1') {
        if(use_secure === 'disable') {
            http.createServer(app).listen({port: usedasbaseport, agent: false}, function () {
                console.log('das server (http) (' + ip.address() + ') running at ' + usedasbaseport + ' port');
            });
        } else {
            var options = {
                 key: fs.readFileSync('server-key.pem'),
                 cert: fs.readFileSync('server-crt.pem'),
                 ca: fs.readFileSync('ca-crt.pem')
            };
            https.createServer(options, app).listen({port: usedasbaseport, agent: false}, function () {
                console.log('das server (https) (' + ip.address() + ') running at ' + usedasbaseport + ' port');
            });
        }
    }
});

console.log('DAS-AEID=',usedasaeid);
console.log('SPID=',usespid);
console.log('CSEID=',usecseid);
console.log('CSEBase=',usecsebase);

// request.bodyの内容を解析して、各バインディングプロトコルをJSON形式に変換した結果を、request.bodyに上書き
function parse_to_json(request, response, callback) {
    var body_Obj = {};

    try {
        console.log(request.body.toString());
        body_Obj = JSON.parse(request.body.toString());

        console.log(Object.keys(body_Obj));
//      make_short_nametype(body_Obj);
        if (Object.keys(body_Obj)[0] == 'undefined') {
            responder.error_result(request, response, 400, 4000, '[parse_to_json] root tag of body is not matched');
            callback('0', body_Obj);
        }
        request.headers.rootnm = Object.keys(body_Obj)[0];
		console.log('rootnm=');
	        console.log(request.headers.rootnm);
        request.bodyObj = body_Obj;
        callback('1', body_Obj);
    }
    catch (e) {
        responder.error_result(request, response, 400, 4000, '[parse_to_json] do not parse json body');
        callback('0', body_Obj);
    }
}

function parse_body_format(request, response, callback) {
//    console.log("parse_body_format");
    parse_to_json(request, response, function(rsc, body_Obj) {
        if(rsc == '0') {
            callback('0', body_Obj);
        }
        else {
console.log('parse_to_json OK');
//console.log(Object.getOwnPropertyNames(body_Obj));
     console.log(body_Obj);
     console.log(request.body.toString());
//     body_Obj=request.body.toString();
//            request.headers.rootnm = Object.keys(body_Obj)[0];
            request.headers.rootnm = Object.keys(request.body)[0];
console.log('rootnm=',request.headers.rootnm);

            for (var prop in body_Obj) {
console.log(prop);
//                if (body_Obj.hasOwnProperty(prop)) {
//                    for (var attr in body_Obj[prop]) {
                        // ObjectのattributeがJSON形式になっていることをチェックする
//                        if (body_Obj[prop].hasOwnProperty(attr)) {
console.log('attr=',body_Obj[prop]);
			attr=body_Obj[prop];
/*
                            if (attr == 'aa' || attr == 'at' || attr == 'poa' || attr == 'acpi' || attr == 'srt' ||
                                attr == 'nu' || attr == 'mid' || attr == 'macp' || attr == 'rels' || attr == 'rqps' || attr == 'srv') {
                                if (!Array.isArray(body_Obj[prop][attr])) {
                                    body_Obj = {};
                                    body_Obj['dbg'] = attr + ' attribute should be json array format';
                                    responder.response_result(request, response, 400, body_Obj, 4000, request.url, body_Obj['dbg']);
                                    callback('0', body_Obj);
                                    return '0';
                                }
                            }
*/
                            if (prop == 'url'){
                               console.log('url=',attr);
                               request.url = attr;
                            }
                            else if (prop == 'ty'){
                               console.log('ty=',attr);
                               request.ty = attr;
                            }
                            else if (attr == 'lbl') {
                                if (body_Obj[prop][attr] == null) {
                                    body_Obj[prop][attr] = [];
                                }
                                else if (!Array.isArray(body_Obj[prop][attr])) {
                                    body_Obj = {};
                                    body_Obj['dbg'] = attr + ' attribute should be json array format';
                                    responder.response_result(request, response, 400, body_Obj, 4000, request.url, body_Obj['dbg']);
                                    callback('0', body_Obj);
                                    return '0';
                                }
                            }
                            else if (attr == 'enc') {
                                if (body_Obj[prop][attr].net) {
                                    if (!Array.isArray(body_Obj[prop][attr].net)) {
                                        body_Obj = {};
                                        body_Obj['dbg'] = attr + '.net attribute should be json array format';
                                        responder.response_result(request, response, 400, body_Obj, 4000, request.url, body_Obj['dbg']);
                                        callback('0', body_Obj);
                                        return '0';
                                    }
                                }
                                else {
                                    body_Obj = {};
                                    body_Obj['dbg'] = attr + 'attribute should have net key as child in json format';
                                    responder.response_result(request, response, 400, body_Obj, 4000, request.url, body_Obj['dbg']);
                                    callback('0', body_Obj);
                                    return '0';
                                }
                            }
                            else if (attr == 'pv' || attr == 'pvs') {
                                if (body_Obj[prop][attr].hasOwnProperty('acr')) {
                                    if (!Array.isArray(body_Obj[prop][attr].acr)) {
                                        body_Obj = {};
                                        body_Obj['dbg'] = attr + '.acr should be json array format';
                                        responder.response_result(request, response, 400, body_Obj, 4000, request.url, body_Obj['dbg']);
                                        callback('0', body_Obj);
                                        return '0';
                                    }

                                    var acr = body_Obj[prop][attr].acr;
                                    for (var acr_idx in acr) {
                                        if (acr.hasOwnProperty(acr_idx)) {
                                            if (acr[acr_idx].acor) {
                                                if (!Array.isArray(acr[acr_idx].acor)) {
                                                    body_Obj = {};
                                                    body_Obj['dbg'] = attr + '.acr[' + acr_idx + '].acor should be json array format';
                                                    responder.response_result(request, response, 400, body_Obj, 4000, request.url, body_Obj['dbg']);
                                                    callback('0', body_Obj);
                                                    return '0';
                                                }
                                            }

                                            if (acr[acr_idx].acco) {
                                                if (!Array.isArray(acr[acr_idx].acco)) {
                                                    body_Obj = {};
                                                    body_Obj['dbg'] = attr + '.acr[' + acr_idx + '].acco should be json array format';
                                                    responder.response_result(request, response, 400, body_Obj, 4000, request.url, body_Obj['dbg']);
                                                    callback('0', body_Obj);
                                                    return '0';
                                                }
                                                for (var acco_idx in acr[acr_idx].acco) {
                                                    if (acr[acr_idx].acco.hasOwnProperty(acco_idx)) {
                                                        var acco = acr[acr_idx].acco[acco_idx];
                                                        if (acco.acip) {
                                                            if (acco.acip['ipv4']) {
                                                                if (!Array.isArray(acco.acip['ipv4'])) {
                                                                    body_Obj = {};
                                                                    body_Obj['dbg'] = attr + '.acr[' + acr_idx + '].acco.acip.ipv4 should be json array format';
                                                                    responder.response_result(request, response, 400, body_Obj, 4000, request.url, body_Obj['dbg']);
                                                                    callback('0', body_Obj);
                                                                    return '0';
                                                                }
                                                            }
                                                            else if (acco.acip['ipv6']) {
                                                                if (!Array.isArray(acco.acip['ipv6'])) {
                                                                    body_Obj = {};
                                                                    body_Obj['dbg'] = attr + '.acr[' + acr_idx + '].acco.acip.ipv6 should be json array format';
                                                                    responder.response_result(request, response, 400, body_Obj, 4000, request.url, body_Obj['dbg']);
                                                                    callback('0', body_Obj);
                                                                    return '0';
                                                                }
                                                            }
                                                        }

                                                        if (acco.actw) {
                                                            if (!Array.isArray(acco.actw)) {
                                                                body_Obj = {};
                                                                body_Obj['dbg'] = attr + '.acr[' + acr_idx + '].acco[' + acco_idx + '].actw should be json array format';
                                                                responder.response_result(request, response, 400, body_Obj, 4000, request.url, body_Obj['dbg']);
                                                                callback('0', body_Obj);
                                                                return '0';
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            else {
				console.log('Unknown attr');
                            }
//                        }
//                    }
//                }
            }

            callback(request.ty, body_Obj);
        }
    });
}

// CORS対応
app.use(function (req, res, next) {
//    console.log("CORS対応");
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, X-M2M-RI, X-M2M-RVI, X-M2M-RSC, Accept, X-M2M-Origin, Locale');
    res.header('Access-Control-Expose-Headers', 'Origin, X-Requested-With, Content-Type, X-M2M-RI, X-M2M-RVI, X-M2M-RSC, Accept, X-M2M-Origin, Locale');
    (req.method == 'OPTIONS') ? res.sendStatus(200) : next();
});

app.use(function (request, response, next) {
    // Check X-M2M-RI Header
    if ((request.headers['x-m2m-ri'] == null || request.headers['x-m2m-ri'] == '')) {
        responder.error_result(request, response, 400, 4000, 'BAD REQUEST: X-M2M-RI is Mandatory');
        return '0';
    }
    request.headers.usebodytype = 'json';
    request.url = request.url.replace('%23', '#'); // convert '%23' to '#' of url
    request.hash = url.parse(request.url).hash;

    var absolute_url = request.url.replace('\/_\/', '\/\/').split('#')[0];
    absolute_url = absolute_url.replace(usespid, '/~');
    absolute_url = absolute_url.replace(/\/~\/[^\/]+\/?/, '/');
    var absolute_url_arr = absolute_url.split('/');

    console.log(absolute_url_arr);
    console.log('\n' + request.method + ' : ' + request.url);
    request.bodyObj = {};

    next();
});

function isEmptyObject(obj){
  return !Object.keys(obj).length;
}

function isValidJson(value) {
  try {
    JSON.parse(value)
  } catch (e) {
    return false
  }
  return true
}


function get_body_json_data2(request){
    return new Promise(function(resolve,reject ) {
    var fullBody = '';
    request.on('data', function (chunk) {
        fullBody += chunk.toString();
    }).on('end', function () {
	try {
	console.log('fullbody=',fullBody);
        var body_Obj = JSON.parse(fullBody.toString());
	console.log('body=',body_Obj);
            resolve(body_Obj);
	}catch(e){
//	    console.log(e)
	    reject(e);
	}
    });
    });
}
function get_body_json_data(request, callback){

    var fullBody = '';
    request.on('data', function (chunk) {
        fullBody += chunk.toString();
    });
    console.log('fullbody=',fullBody);
    request.on('end', function () {
//        if (fullBody == "") {
//            callback(1,'body is empty');
//            return '0';
//        }
	try {
            body_Obj = JSON.parse(fullBody.toString());
            callback(0,body_Obj);
	}
        catch (e) {
	    console.log(e);
            callback(1, '[parse_to_json] do not parse json body');
        }
    });
}

function UserException(message) {
   this.message = message;
   this.name = "UserException";
}

// POST
// (1) /das/dynamicacpinfo
//
// ソースはPPMを参照する
// domains, originatorIDs(List of CSIDs and/or AEIDs (wild character'*' is allowed match detection is terminated by next '/'), all, Role-IDs
// 'all'　全ＯＫ
// いずれかに一致（wild characterに注意）
// 
// Name		Description										Wildcard applicability
// domain	A M2M-SP-ID representing domain/subdomain						Allowed
// originatorID	CSE-ID											Allowed
// 		AE-ID											Allowed
// 		The resource-ID of a <group> resource which contains <AE> or <remoteCSE> as member	Not allowed
// all		Any Originators are allowed								Not allowed
// Role-ID	A Role Identifier as defined in clause 7.1.14 of TS-0001 [6]				Not allowed
//
//      if(acor == 'all')
//		return true;
//      else if( rq_or included_in acor)  // Wildcard can be used deo domain/CSE-ID/AE-ID
//              return true;
//       else
//              return false;
//
//
// https://stackoverflow.com/questions/8676979/glob-in-node-js-and-return-only-the-match-no-leading-path/24445294

// 
// C:\Users\h-kato\Documents\das-server-org>node
// > var ptr=require('path-to-regexp');
// undefined
// > const ah4= ptr.match("/user/yy:iduuuu/test(.*)", {decode: decodeURIComponent });
// undefined
// > ah4("/user/yyasofopsfo/test2");
// { path: '/user/yyasofopsfo/test2',
//   index: 0,
//   params: { '0': '2', iduuuu: 'asofopsfo' } }
// >
// 
// https://github.com/pillarjs/path-to-regexp
function checkOriginators(rq_or,stored_acor){
    console.log('checkOriginators');
//        acor = ['all'];
//        acor = ['//kddi.jp/cse-id/cse*base/service_ae','//kddi.jp/cse-id/cse-base/*_ae'];
    acor = [];
    acor.push(stored_acor);
    
	var new_acor = [];

        console.log(rq_or + ":" + acor);

        if(Array.isArray(acor) && acor.length > 0){
		if(acor.length == 1 && acor.includes('all')){
			console.log('Allow all orinators');
			new_acor.push('all');
			return true;
		}else{
		        for(var allowed_originator of acor){
				allowed_org_str = allowed_originator.replace(/\*/,'(.*)');
				console.log(allowed_org_str);
				var matcher = pathToRegexp.match(allowed_org_str,  {decode: decodeURIComponent });
                                if(matcher(rq_or)){
					console.log('Requested Originator is allowed!');
					new_acor.push(allowed_originator);
				}
			};
		}
		console.log(JSON.stringify(new_acor));
		if(!isEmptyObject(new_acor))
			return new_acor;
		else
			throw new UserException("No matching ACOR info");
	} else{
		throw new UserException("malformed ACOR data");
	}
}

// 0-63 の数値。ANDを取るか？callbackで値を返すように変更しないとダメ
// 6.3.4.2.29	m2m:accessControlOperations
// Used for accessControlPolicys.
// Table 6.3.4.2.29 1: Interpretation of accessControlOperations
// Value	Interpretation	Note
// 1		CREATE
// 2		RETRIEVE
// 4		UPDATE
// 8		DELETE
// 16		NOTIFY
// 32		DISCOVERY	
// NOTE:	Combinations of these values are specified by adding them together. For example the value 5 is interpreted as "CREATE and UPDATE".
// 加算でＯＫ。5= CREATE+UPDATE

function checkOperations(rq_op, acop){

	new_acop = rq_op & acop; 

	if (new_acop != 0)
		return new_acop;
	else
		throw new UserException("No operation allowed!");
}

// TS-0004 7.3.8 
// Add time window check logic here 
// https://www.npmjs.com/package/node-cron　→　年をチェックできない
// "actw" : ["* 0-5 2,6,10 * * * *"] 秒、分、時、日、月、曜日、年　→毎日、2時5分、6時5分、10時5分
// 上記のPackageのチェックコードのみを拝借す（pattern-validation.jsで形式をチェックして、time-matcher.js生成時刻とマッチする）。
//    1)年は拡張する必要がある
//    2)Month,Wee-day-nameは文字列が入らないので、特に不要。
// https://github.com/node-cron/node-cron/blob/2a3970390b8dffa20b0a1bbf5ba2f71e8b4405d2/src/pattern-validation.js#L28 参照
// 1.要求時刻を各要素に分解(スペース区切り→複数スペースはシングルスペースに変換）
// 2.actwの*や-、Steps(0-23/2 →0,2,4,6,8,10,12,14,16,18,20,22)などは、全て数字のリストに直す
// 3.要求時刻の各要素が2の対応するリストに含まれているかをチェックし、全てのチェックがＯＫならＯＫ。
// 
// ACTW（TS-0004 v3.7.0 Sction.7.4.9)
// The scheduleElement attribute represents the list of scheduled execution times.
// The each entry of the scheduleElelement attribute shall consist of a line with 7 field values (See Table 7.4.9.1-4). 
// The time to be matched with the schedule pattern shall be interpreted in UTC timezone.
// 
// Field Name		Range of values		Note
// Second		0 to 59	
// Minute		0 to 59	
// Hour			0 to 23	
// Day of the month	1 to 31	
// Month of the year	1 to 12	
// Day of the week	0 to 6			0 means Sunday
// Year			2000 to 9999
// Each field value can be either an asterisk ('*': matching all valid values), an element, or a list of elements separated by commas(',').
// An element shall be either a number, a range (two numbers separated by a hyphen '-') or a range followed by a step value. A step value (a slash '/' followed by an interval number) specifies that values are repeated over and over with the interval between them. 
// For example, note "0-23/2" in the Hour field is equivalent to "0,2,4,6,8,10,12,14,16,18,20,22". A step value can also be used after an asterisk.
// The task which shall be executed is depending on the parent resource of the <schedule> resource (see Table 7.4.9.1 5). 

function checkTimeWindows(rq_time, actw, callback){

	var new_actw=[];
    //	actw=["* 0-30 2,6,10,11 * * * *"]
    actw=["* * * * * * *"];    
	for( var actw_ele of actw) {
		actw2=actw_ele.replace(/"/g, "");
		// convert time (in ISO8621 basic format to extended format) as UTC
            	rq_time_date = new Date(rq_time.substring(0,4),rq_time.substring(4,6)-1,rq_time.substring(6,8),rq_time.substring(9,11),rq_time.substring(11,13),rq_time.substring(13));
            	console.log(rq_time_date);
            	if(timeCheck.validate_expression(actw2)){
			console.log('valid expression');
                	if(timeCheck.req_time_validation(actw2,rq_time_date)){
				console.log('request time is valid');
				new_actw.push(actw_ele);
			}
            	}
        }
	if(!isEmptyObject(new_actw))
	    return new_actw;
	else
	    throw new UserException("No matching ACTW info");
}

// ACPのデータは、ip4/ip6のリストの片方あるいは両方を保持する
// accessControlIpAddresses (acip)
// Add ip address check logic here 
//  if( ipaddr.IPv4.isIPv4(rq_ip) )
//      return(ipRangeCheck(rq_ip in ipv4, acip in ipv4(atom or list))
//  else // ipv6
//      return(ipRangeCheck(rq_ip in ipv6, acip in ipv6(atom or list))
//
// npm library: https://www.npmjs.com/package/ip-range-check	var ipRangeCheck = require("ip-range-check");	ipRangeCheck("192.168.1.1", ["102.1.5.2/24", "192.168.1.0/24", "106.1.180.84"])
// 		https://www.npmjs.com/package/ipaddr.js		var ipaddr = require('ipaddr.js'); 		ipaddr.IPvX.isValid(string)
// npm library: https://github.com/apaprocki/javascript-ipv6/blob/master/ipv6.js

function checkIPAddress(rq_ip,acip){
//        console.log(JSON.stringify(rq_ip) + ":" + JSON.stringify(acip));

        acip['ipv4']=["102.1.5.2/24", "192.168.2.0/24", "106.1.180.84"];
	var ipmatchedlist = [];
	var new_acip={};

	        if( ipaddr.IPv4.isIPv4(rq_ip['ipv4']) ){
			console.log(rq_ip['ipv4'],acip['ipv4']);
			for (var ipaddress_pattern of acip['ipv4']) {
				if(ipRangeCheck(rq_ip['ipv4'],ipaddress_pattern)){
					ipmatchedlist.push(ipaddress_pattern);
		      		}
		    	}
		    	console.log(ipmatchedlist);
		    	new_acip['ipv4']= ipmatchedlist;
		}
        	else if (ipaddr.IPv6.isIPv6(rq_ip['ipv6']) ){
			console.log(rq_ip['ipv6'],acip['ipv6']);
			for (var ipaddress_pattern of acip['ipv6']) {
				if(ipRangeCheck(rq_ip['ipv6'],ipaddress_pattern)){
					ipmatchedlist.push(ipaddress_pattern);
				}
			}
			console.log(ipmatchedlist);
			new_acip['ipv6']= ipmatchedlist;
		}
	
	if(!isEmptyObject(ipmatchedlist))
	    return new_acip;
	else
	    throw new UserException("Unknow ip address format requested");

}

        // 
        // Add location check logic here 
        // [lat,long,radius], list of country code
        // https://www.npmjs.com/package/geolocation-utils
        // distanceTo(from: Location, to: Location) : number[ in meters ]
        // 2点間の距離を計算する。この結果が、R(adius)以下であればＯＫとなる
        // Element Path       |	      Element Data Type 	| Multiplicity	| Note
 	// circRegion(accr)   |       List of 3 xs:float        | 0..1		| The values represent latitude (+/-90 degrees), longitude (+/-180 degrees), and radius (metres)
        // countryCode(accc)  |       list of m2m:countryCode	| 0..1		|
        //
        // (基本的には、TS-0004 6.3.5.28	m2m:locationRegionでは、どちらかのみ存在するが、DASは両方の記述があってもOK）

        // circRegion: {geolocation1,geolocation2,geolocation3,...}, geolocation = List of 3 xs:float	0..1	The values represent latitude (+/-90 degrees), longitude (+/-180 degrees), and radius (metres)
        // countryCode	list of m2m:countryCode	0..1	
	//
        // 計算ロジック
	// import { 
	//  toLatLon, toLatitudeLongitude, headingDistanceTo, moveTo, insidePolygon 
	// } from 'geolocation-utils'
        // var geoLocation = require('geolocation-utils')
        // new_rq_loc = [];
	// 
	// if(locFormat(rq_loc)=='circRegion'){
        //     aclr.some(function(aclr_pos){
        //         rq_loc.some(function(rq_loc_pos){
	//             distance_between_2points = geoLocation.distanceTo(aclr(without Radius),rq_loc_pos(without Radius))
        //             if( (Radius of aclr_pos -(distance_between_2points + Radius of rq_loc_pos)) >= 0 )
        //                 new_rq_loc.push(rq_loc_pos);
        //             }
        //         });
        //    }
        // }else{ // countryCode
        //     rq_loc.some(function(rq_loc_code){
        //         if( aclr.includes(rq_loc_code)){
	//         	new_rq_loc.push(rq_loc_code);
        //         }
        //     });
        // }
        // return new_rq_loc;
        //
        // IPから位置情報を取得することも可能だが、ここではやらない
        // aclr['accr'] = [lat in degree (0=< =<90), long in degree (0=< =<180)

function checkGeoLocation(rq_loc,aclr){

        aclr['accr'] = [49.975, 29.975, 10000];
        aclr['accc'] = ['US', 'UK', 'CH', 'CN', 'KR'];
//        console.log('type of rq_loc = ', typeof(rq_loc));
//        console.log('type of aclr = ', typeof(aclr));
//        console.log(rq_loc + ":" + aclr['accr']+ ":" + aclr['accc']);
//	console.log('rq_loc.length=', rq_loc.length );

 	var locationmatchedlist = [];
	var new_aclr = {};
	console.log(rq_loc[0]);

	if(!isEmptyObject(rq_loc) && typeof(rq_loc[0])== 'number' ){
             if(!aclr['accr']  ){
		console.log('No geo-location info exists for matching');
		throw new UserException('No geo-location info exists for matching');
	     }
	     console.log('checking circle region=',rq_loc);
	     console.log('is located inside of the region defined by = ',aclr['accr']);

		region = aclr['accr'];
                rq_latlng = geoLocation.createLocation(parseFloat(rq_loc[0]), parseFloat(rq_loc[1]),'LatLon');
                rq_radius = parseFloat(rq_loc[2]);
	        aclr_latlng = geoLocation.createLocation(parseFloat(region[0]), parseFloat(region[1],'LatLon'),'LatLon')
	        aclr_radius = parseFloat(region[2]);
                console.log(rq_radius);
                console.log(aclr_radius);
	
	        distance_between_2points = geoLocation.distanceTo(rq_latlng,aclr_latlng);
                console.log(distance_between_2points);
                if((distance_between_2points + rq_radius) <= aclr_radius){
		    console.log('OK. Requested area(zone) is inside or equal to the allowed area');
		    new_aclr['accr']=region;
	        }

	}else if(!isEmptyObject(rq_loc) && typeof(rq_loc[0]) == 'string'){
                if(!aclr['accc'] ){
		   console.log('No country code exists for matching');
		   throw new UserException('No country code for matching');
		}
		// List同士を比較して、requestに含まれる国コードが、ACP側に含まれる場合に、許可リストに追加する
		// 含まれない国コードは、許可リストには含めない
		console.log('checking country codes=',rq_loc );
		console.log(' is included in the list of country codes=',aclr['accc']);

		for(var cntrycode of rq_loc){
			console.log('request country code=', cntrycode);
			if(aclr['accc'].includes(cntrycode)){
				locationmatchedlist.push(cntrycode);
				console.log('country code matched!');
			}
		}
		new_aclr['accc']=locationmatchedlist;
	}

        console.log('matched location is ',locationmatchedlist);
	console.log(new_aclr);
	if(!isEmptyObject(new_aclr) ){
		return new_aclr;
        }else{
	    throw new UserException("No proper matching/matched location data exists");
	}
}

function checkAuthentication(acaf, originator){
  if(acaf == false || acaf == undefined){
	console.log('Apply ACP');
	return true;
  }else{
    // check if originator has been autheticated
    // if( originator == autheticated)
           console.log(originator + ":" + acaf);
	console.log('Apply ACP');
	return true;
    // else
    //     throw new UserException("Applying ACP is not allowed");
  }
}

function send_back_empty_content(request, response){

    final_response = {};
    //    final_response['m2m.rsp'] = {};
    final_response['m2m:seci']={"sit":2, "dres":{}};
    console.log(JSON.stringify(final_response));
    //  Send back empty content
    responder.response_result(request, response, 200, JSON.stringify(final_response), 2000, '');
}

app.post('/das/dynaAuth', async function (request, response) {
    console.log('app.post dynaAuthDasRequest\n',request.params);
    console.log('headers = ',request.headers);
    /*
    var body_Obj = await get_body_json_data2(request).then(function(value){console.log('object =', value)}).catch((err) => {
        responder.error_result(request, response, 400, 4102, err);
	console.log(err);
	return 0;
    });
    console.log(body_Obj);
    var err = 0;
*/
    get_body_json_data(request, function(err, body_Obj) {
        if (!err) {
            if(isValidJson(JSON.stringify(body_Obj))){
		console.log('Valid Json');
		console.log(JSON.stringify(body_Obj));
            }else{
                console.log('Invalid Json... returning');
                error = "invalid JSON format."
                responder.error_result(request, response, 400, 4102, error);
                return 0;
            }
	    
            response_info = {};

	    seci_data = body_Obj['m2m:seci'];
	    console.log('body =',JSON.stringify(seci_data));

                   for(seci_key in seci_data ){
	               if(seci_key == 'sit' && seci_data[seci_key] != 1){					
                           responder.error_result(request, response, 500, 5000, 'NG:Parameter [sit] in [seci] is not 1(Dynamic Authorization Request).');
                           return 0;
		       }
                       // dreqパラメータの処理
                       if(seci_key == 'dreq'){
                           dreq_data = seci_data[seci_key];
                           console.log('dreq=', dreq_data);
 	                   dreq_mandatory_keys = ['or', 'trt', 'op', 'trid'];  // trid is not mandatory in the onem2m spec, but this parameter should be defined to get proper ACP of the target resource
		           var dreq_data_keys = Object.keys(dreq_data);

                           for (var dreq_mandatory_key of dreq_mandatory_keys){
		               if(!dreq_data_keys.includes(dreq_mandatory_key)){
				   if(dreq_mandatory_key == 'trid'){  // in the spec 'trid' is option. So if it does not exist or empty, just send back the empty content.
				       send_back_empty_content(request, response);
			           }else{
				       responder.error_result(request, response, 500, 5000, 'mandatory security parameters NOT matched!');
				   }
			           return 0;
                	       }
                           }

			   tids = [];
			   orid = [];
			   rfa = [];
			   
                           for( dreq_key in dreq_data ) {
			       // originator	m2m:ID
		               if(dreq_key == 'or'){
			           if( !dreq_data[dreq_key]){
				       responder.error_result(request, response, 500, 5000, 'Parameter [or] in [dreq] is empty.');
				       return 0;
				   }
                                   else
				       response_info[dreq_key]=dreq_data[dreq_key];
			       }
			       // targetedResourceType	m2m:resourceType
			       if(dreq_key == 'trt'){
			           if (dreq_data[dreq_key] != 2 && dreq_data[dreq_key] != 3 && dreq_data[dreq_key] != 4){   // ae,cnt,cinのみ
			               responder.error_result(request, response, 500, 5000, 'Parameter ' + dreq_key + ' of the request is not supported.');
				       return 0;
                                   } else
				       response_info[dreq_key]=dreq_data[dreq_key];
			       }
			       // operation	m2m:operation
		               if(dreq_key == 'op'){
			           if( !dreq_data[dreq_key]){
				       responder.error_result(request, response, 500, 5000, 'Parameter [op] in [dreq] is empty.');
				       return 0;
				   }
                                   else
				       response_info[dreq_key]=dreq_data[dreq_key];
			       }
                               // originatorIP	(anonymous)
                               // originatorIP/ipv4Address	m2m:ipv4
                               // originatorIP/ipv6Address	m2m:ipv6
			       if(dreq_key == 'oip'){
			           if( dreq_data[dreq_key]){
				        rq_ip=dreq_data[dreq_key];
                                        console.log('rq_ip=',rq_ip);
                                   }else{
				       // if oip exist, either ipv4/ipv6 should be exist (check the spec)
				      responder.error_result(request, response, 500, 5000, 'Data of parameter [oip] in [dreq] should not be empty.');
				       return 0;
				   }
                               }
			       // originatorLocation	m2m:locationRegion
			       if(dreq_key == 'olo'){
			           if( dreq_data[dreq_key]){
				        rq_loc=dreq_data[dreq_key];
                                        console.log('rq_loc=',rq_loc);
                                   }
                               }
			       // originatorRoleIDs	List of m2m:roleID
			       if(dreq_key == 'orid'){
				   console.log('originatorRoleIDs will be implemented in Phase2');
			           if( dreq_data[dreq_key]){
				        orid=dreq_data[dreq_key];
                                        console.log('originatorRoleIDs=',orid);
                                   }
                               }
			       // requestTimestamp	m2m:absRelTimestamp
			       if(dreq_key == 'rts'){
			           if( dreq_data[dreq_key]){
				        rq_time=dreq_data[dreq_key];
                                        console.log('rq_time=',rq_time);
                                   }
                               }
			       // targetedResourceID	xs:anyURI
                               if(dreq_key == 'trid'){
			           if( !dreq_data[dreq_key]){
				       //				       responder.error_result(request, response, 500, 5000, 'Parameter [trid] in [dreq] is empty.');
				       // Empty content will be returned when no trid is found
				       // T.B.D The data format of the empty content should be checked.
				       send_back_empty_content(request, response);
				       return 0;
				   } else
				        response_info[dreq_key]=dreq_data[dreq_key];
			       }
			       // proposedPrivilegesLifetime	m2m:absRelTimestamp
			       if(dreq_key == 'ppl'){
			           if( !dreq_data[dreq_key])
			                response_info[dreq_key]=0;
		                   else
				        response_info[dreq_key]=dreq_data[dreq_key];
                               }
			       // rfa(roleIDsFromACPs)	List of m2m:roleID 
                               if(dreq_key == 'rfa'){
				   console.log('roleIDsFromACPs will be implemented in Phase2');
			           if( dreq_data[dreq_key]){
				        rfa=dreq_data[dreq_key];
                                        console.log('roleIDsFromACPs=',rfa);
                                   }
                               }
			       // tids(token-id list) will be supported in phase3.	tokenIDs	List of m2m:tokenID

                               if(dreq_key == 'tids'){
				   console.log('token-id list will be implemented in Phase3');
			           if( dreq_data[dreq_key]){
				        tids=dreq_data[dreq_key];
                                        console.log('token-id list=',tids);
                                   }
                               }
			       // asi(authorSignIndicator) will be not implemented. authorSignIndicator	xs:boolean
			       if(dreq_key == 'asi'){
			           console.log('not implemented');
				   //// T.B.D when 'asi' is defined, should we just send back the error and terminate the process OR just ignore and continue the process?
				   //responder.error_result(request, response, 501, 5001, body_Obj['dbg']);
                                   //return 0;
                               }
                           } // end of for 
                       } // end of if dreq
    	           } // end of for seci_key
/*
               } // end of pc
           }  // end of for in body_data
*/
       }else{
            console.log('body data is missing or has invalid JSON format');
	    body_Obj['dbg'] = 'Exception Error.';
            responder.error_result(request, response, 500, 5000, body_Obj['dbg']);
            return 0;
	}

	// Phase2ではTokenもサポートする
	console.log('Check the validity of received request');
        // header (X-M2M-RIや、Notifyで返信する必要がある。POST）

	// Phase3
	// Step 1.Check if token-id exits in the received parameters.
	// 	Yes: goto indirect DAS flow
	//		Get token info related to token-id
	//		if the indirect flow failed, go to next step.
	//	No: goto Role-ID flow
	if( !isEmptyObject(tids)) {
	    console.log('token id received');
	    try {
		console.log('Retreive tokens from token-ids');
		db_sql.select_tokens_from_tokenids(tids,function(err,result){
		    if(err || isEmptyObject(result)){
			console.log("no matched token data found for tokenids about " + tids);
			responder.error_result(request, response, 500, 5000, 'No token data found in DB.');
                	return 0;
                    }else{
			console.log('result2 =',result);
   		        result_objects = JSON.parse(JSON.stringify(result));
                        console.log('result_object = ', result_objects);
			tokens = [];
			for (tokenObj of result_objects){
			    tokens.push(tokenObj['tkob']);
			}
			dres ={};
			dres['tkns'] = tokens;
			seci= {};
			seci['sit'] = 2;	// Dynamic Authorization Response (dres)
			seci['dres'] = dres;
			console.log('seci = ',JSON.stringify(seci));
			final_response = {};
			final_response['m2m:seci']=seci;
			responder.response_result(request, response, 200, JSON.stringify(final_response), 2000, '');
			return 0;
		    }
	    	});
		
	    } catch(e) {
		console.log('Token could not be retreived from given token-id');
		responder.error_result(request, response, 500, 5000, 'No token data found in DB.');
                return 0;
	    }
	}
	else if(!isEmptyObject(orid) || !isEmptyObject(rfa)) {  //if any Role-IDs received
        // Phase 2.Check if Role-IDs (orid and rfa) exits in the received parameters.
	// 	Yes: goto DAS role-ID flow
	//		if the role-ID flow failed, go to next step.
	    //	No: goto control parameter flow
	    console.log('role id received');
	    try {
		console.log('Retrieve ACP info from role-ids');
		var req_roleids = orid.concat(rfa);
		console.log('requested roleids =',req_roleids);
//		var orig_roleids = get_roleids(or);
//		console.log('roleids for Originator =',oriq_roleids);
//		filtered_roleids = req_roleids.filter((value) => orig_roleids.includes(value));
		var filtered_roleids = req_roleids.filter((x, i, self) => self.indexOf(x) === i); // remove duplicated
		console.log('filtered_roleids = ',filtered_roleids );
		// get acp info from roleids (and originator) from acp table

		db_sql.select_acps_from_roleids(filtered_roleids,function(err,result){
		    if(isEmptyObject(result)){
			console.log("no matched ACP data found for roleids about " + filtered_roleids);
			responder.error_result(request, response, 500, 5000, 'No ACP data found in DB.');
                	return 0;
                    }else{
			// send back correct ACP info list
			console.log('result2 =',result);
   		        result_objects = JSON.parse(JSON.stringify(result));
			//			console.log('result_objects = ', result_objects);
			policy_datas = [];
			trids = [];
			for (result_object of result_objects){
			    trid = result_object['trid'];
			    policy_data = JSON.parse(result_object['policy']);  // Add acor
			    delete policy_data['pl'];
			    policy_data['acor'] = [result_object['or']];
			    trids.push(trid);
                            policy_datas.push(policy_data);
			}
			console.log('trids=', trids);
			console.log('policy_datas=', policy_datas);
			// create dai or tokens
			//			console.log('rlid =', result_object['rlid']);
			token.createTokenFromACP(policy_datas,response_info['or'],trids,'JWE',function(err,result){
			    dres= {};
 			    console.log('token =', result);
			    dres['tkns'] = [result['tkob']];
			    seci= {};
			    seci['sit'] = 2;	// Dynamic Authorization Response (dres)
			    seci['dres'] = dres;
			    console.log('seci = ',JSON.stringify(seci));
			    final_response = {};
			    final_response['m2m:seci']=seci;
			    //  Send back Notify(dynaAuthDasResponse)
			    responder.response_result(request, response, 200, JSON.stringify(final_response), 2000, '');
			    return 0;
			});
		    }
	    	});
	    } catch(e){
		console.log('Role info could not be retreived from given role-id');
		responder.error_result(request, response, 500, 5000, 'No role info data found in DB.');
                return 0;
	    }	
	}

	/**/
	else {
        // Step 3.Check if access control parameters exists in the received parameters.
	//	Yes: goto DAS access control parameters flow (implemented in Phase1)
	//	No: Send back dynaAuthDASResponse with empty content in sit
        // When any one of the above steps(1-3) is succeeded, DAS sends back the dynaAuthDASResponse to HCSE.

	// trt == 4 (contentInstanceの場合は、containerのtridを取得して、containerのACPを返信する）
	    if (response_info['trt'] == 4) {
		data_len = response_info['trid'].length;
		splitted_path = response_info['trid'].split('/');
		path_depth = splitted_path.length;
		trid_info = response_info['trid'].substr(0,data_len-(splitted_path[path_depth-1].length + 1));  // 最後の1は'/'分
	    }else{
		trid_info = response_info['trid'];
            }

	// Retrieve target resource ACP data
	//  T.B.D  when there is no trid info in db, should we send back empty contents?
	db_sql.select_acp(trid_info,response_info['or'],function(err,result){
            if(isEmptyObject(result)){
		console.log("no matched ACP data found for "+ response_info['or'] + " about " + trid_info);
		//		responder.error_result(request, response, 500, 5000, 'No data found in DB.');
		send_back_empty_content(request, response);
                return 0;
	    }
	    else{
		result_object = JSON.parse(JSON.stringify(result[0]));
                policy_data = JSON.parse(result_object['policy']);
                console.log(result_object);
		//
		// Compare dreq data with target resource ACP data
		//

                // Check ACOR
		try {
			var result = checkOriginators(response_info['or'], result_object['or']);
			policy_data['acor'] = result;
		}catch(e){
			console.log('request originator is NOT OK');
                        send_back_empty_content(request, response);
			return 0;
		}

                // check ACOP
		try {
	                var result = checkOperations(response_info['op'], policy_data['acop']);
			policy_data['acop'] = result;
		}catch(e){                                                                                                                                                      
			console.log('request operation is NOT OK');
                        send_back_empty_content(request, response);
			return 0;
		}

                // check/update ACCO
		if('acco' in policy_data){
                  acco = policy_data['acco'];
		  delete policy_data['acco']; 
    	          acco_flag = false;
                  if(typeof rq_time !== 'undefined'){
		        try {
			  var result = checkTimeWindows(rq_time,acco['actw']);
			  acco['actw'] = result;
			  acco_flag = true;
		        }catch(e){
			  console.log('request time is NOT OK');
                          send_back_empty_content(request, response);
			  return 0 ;
		        };
		  }else{
		    console.log('rq_time is not exist!');
		  }
		
                  if(typeof rq_ip !== 'undefined'){
		    try {
			var result = checkIPAddress(rq_ip,acco['acip']);
			acco['acip'] = result;
			acco_flag = true;
		    }catch(e){
			console.log('request ip is NOT OK');
                        send_back_empty_content(request, response);
			return 0;
		    }
                  }else{
		    console.log('rq_ip is not exist!');
                  }

                  if(typeof rq_loc !== 'undefined'){
		    try {
			var result = checkGeoLocation(rq_loc,acco['aclr']);
        	        acco['aclr'] = result;
			acco_flag = true;
	            }catch(e){
			console.log('request location is NOT OK');
                        send_back_empty_content(request, response);
			return 0;
		    }
                  }else{
		    console.log('rq_loc is not exist!');
                  }

                  if(acco_flag){ 
                    policy_data['acco'] = acco;
		    console.log(acco);
		  }
		}
		
		// check ACOD(resourceType,specializationID,childResourceType)
		// 必須は、childResourceTypeは子リソースのリスト。作成される親の配下に指定される子のタイプがCreateされる場合にのみACPが適用される
		// ACODが存在しない場合は、親の配下にCREATEされる子リソースの全てにACPが適用される
		console.log("ACOD is not supported");

		// check ACAF (no operation at the moment)
                if('acaf' in policy_data){		
		    try {
			var result = checkAuthentication(policy_data['acaf'],response_info['or']);
			console.log('Authentication is OK. Apply acp.');
			// acaf is not supported temporarily
          		delete policy_data['acaf'];
		    }catch(e){
			console.log('Authentication is NOT OK');
                        send_back_empty_content(request, response);
			return 0;
		    }
		}
		
		// plが存在しない場合は、pplが受信データにあればそれを設定する。
		// plも、pplも存在しない場合は、default値 3600000milli秒とする。
		if('pl' in policy_data){
		    //		    ppl_val =  moment().utc().add(1,'h').format('YYYYMMDDTHHmmss');
         	    ppl_val =  moment().add(1,'h').format('YYYYMMDDTHHmmss');
                    delete policy_data['pl'];
		}else if ('ppl' in response_info)
		    ppl_val = response_info['ppl'];
		else 
		//		    ppl_val = 3600000; // default(milli-sec) could be in 20141003T112032 (absolute time),or 3600000 (relative time)
		    ppl_val =  moment().add(1,'h').format('YYYYMMDDTHHmmss');
		// in case absolute time
		// 

                console.log('ppl = ',ppl_val);

		// Header info
		console.log('rh=', request.headers);
		response.setHeader('Content-Type', 'application/json');
		response.setHeader('x-m2m-ri', request.headers['x-m2m-ri']);
		response.setHeader('x-m2m-rsc', 2000);
		response.status(200);
		console.log('response.headers =', response.headers);
		
		dai = {};
		dai['gp'] = [policy_data];
		dai['pl'] = ppl_val;
		console.log('dai = ',dai);

		dres ={};
		dres['dai'] = dai;
		console.log('dres = ',dres);

		//　Add list of tokens. ESData shoule be applied to Each token.
		token.createTokenFromACP([policy_data],response_info['or'],[response_info['trid']],'JWE',function(err,result){
		    console.log('token =', result);
		    dres['tkns'] = [result['tkob']];
		
		seci= {};
                seci['sit'] = 2;	// Dynamic Authorization Response (dres)
                seci['dres'] = dres;
                console.log('seci = ',JSON.stringify(seci));

                final_response = {};
                final_response['m2m:seci']=seci;
                //  Send back Notify(dynaAuthDasResponse)
		    responder.response_result(request, response, 200, JSON.stringify(final_response), 2000, '');
		});
	    }
	});
	}
/**/
    });  // end of  get_body_json_data()
});


// (2) /das/acp 認可情報の登録/更新(登録済の場合は更新する）
// パラメータ名			必須
// ターゲットID			○
// リクエスト元ID			○
// ユーザID				
// ACP情報			○
// 	許可オペレーション		○
// 	有効時間			○
//      ACCO
// 		accessControWindow			
// 		accessControlIpAddresses		
// 		accessControlLocationRegion		
// 	accessControlAuthenticationFlag			
// 	トークンIDリスト				

app.post('/das/acp', function(request, response) {
    console.log('app.post acp regist\n');
    // acpが登録済みなら、更新処理を行う
    // 登録済みかどうかの判定は？　usrはオプションなので、trid/orが一致するかどうかで見るのか？policyは必須だが比較対象ではない。

    get_body_json_data(request, function(err, result) {
        if (!err) {
            body_Obj = result;
            console.log(body_Obj);

            policy_data = body_Obj['policy'];
            if (!body_Obj['trid'] || !body_Obj['or'] || !policy_data) {
                console.log('Mandatory data is missing');
                body_Obj['dbg'] = 'Exception Error.';
                responder.error_result(request, response, 500, 5000, body_Obj['dbg']);
//                return '0';
            } else if (!policy_data['acop'] || !policy_data['pl']) {
                console.log('Mandatory acp data is missing');
                body_Obj['dbg'] = 'Exception Error.';
                responder.error_result(request, response, 500, 5000, body_Obj['dbg']);
//                return '0';
            }

            // regist acp info (policy はそのままDBに保存する）
            db_sql.insert_acp(body_Obj, function(err, results) {
                if (!err) {
                    console.log('acp inserted!');
                    // responseは、更新されたACPをGetしたもの。
/*
                    db_sql.select_acp(body_Obj['trid'], body_Obj['or'], function(err, result) {
		            responder.response_result(request, response, 200, JSON.stringify(result[0]), 2000, '');
                    });
*/
		    db_sql.select_acp(body_Obj['trid'], body_Obj['or'],function(err, result) {
        		// trid/orで指定するデータが存在しない場合、err=null, result=[]がsqlレベルで返る
			console.log(err);
			console.log(result);
        		if (!err) {
            		    responder.response_result(request, response, 200, JSON.stringify(result[0]), 2000, ''); // return ACP info. resultにはacpの検索結果が入ってくる
        		} else {
	    		    console.log('no data found');
            		    responder.error_result(request, response, 500, 5000, 'Exception Error.');
        		}
    		    });
                } else {
                    if (results.code == 'ER_DUP_ENTRY') {
                        console.log('acp data duplicated');
                    }else{
                        console.log('acp insertion was failed');
                    }
	    	    body_Obj['dbg'] = 'Exception Error.';
            	    responder.error_result(request, response, 500, 5000, body_Obj['dbg']);
                }
            });
        }else{
            console.log('body data is missing');
	    body_Obj['dbg'] = 'Exception Error.';
            responder.error_result(request, response, 500, 5000, body_Obj['dbg']);
	}
    });
});

// (3) リソースの登録（CSE, ae, cnt, ACP）

app.post('/das/rce', function(request, response) {
    console.log('app.post rsc regist\n');
    get_body_json_data(request, function(err, result) {
        if (!err) {
            request.bodyObj = result;
            // 必須パラメータのチェック
            if (!body_Obj['url'] || !body_Obj['ty'] || !body_Obj['sri']) {
                console.log('Mandatory data is missing');
                body_Obj['dbg'] = 'Exception Error.';
                responder.error_result(request, response, 500, 5000, body_Obj['dbg']);
                return '0';
            }
            // resourceの情報をlookupテーブルに作成する。作成に　失敗したら、エラーで返す。
            // tyから、保存するテーブルを選択する。
            // そのテーブルに対して、リソース情報を作成する。作成に失敗したら、lookupテーブルで作成したリソースを削除した上で、エラーを返す
//            console.log('headers(x-m2m-origin)=', request.headers['x-m2m-origin']);
//            request.bodyObj.or = request.headers['x-m2m-origin'];
            var url = request.bodyObj.url;

           // urlを解析('/'で分解）して、resource nameを取得する。 
           var url_data = url.split('/');
           request.bodyObj.rn = url_data[url_data.length - 1];
           console.log('rn=', request.bodyObj.rn);
           console.log('request.ty = ',request.bodyObj.ty);

           // ae(ty==2)の場合は、特にAEに特化した処理なし。
           if (request.bodyObj.ty == 3) { // cnt
               // get parent id  "kddi.jp/cse-id/cse-base/sensor_ae/humidity"-> pae = "kddi.jp/cse-id/cse-base/sensor_ae"
               console.log(request.bodyObj.rn.length);
               request.bodyObj.pae = url.substr(0, url.length - (request.bodyObj.rn.length + 1)); // +1は "/humidity"の最初の"/"分
           } else if (request.bodyObj.ty == 5) { // cse, 実は引数にcse-idが入ってくる？
               // get csi "//kddi.jp/cse-id/cse-base" -> "/cse-id"
               request.bodyObj.csi = "/" + url_data[url_data.length - 2];
           }
           console.log(request.bodyObj);
           resource.regist(request, response, function(err,result) {
                if(!err)
			responder.response_result(request, response, 200, JSON.stringify(result), 2000, '');
		else
			responder.error_result(request, response, 500, 5000, result);
           });
       }else{
            console.log('body data is missing');
	    body_Obj['dbg'] = 'Exception Error.';
            responder.error_result(request, response, 500, 5000, body_Obj['dbg']);
        }
    });
});

// GET
// (1) das/rce/_/(リソースのURI)
//  query parameter：　なし
//
// （例）GET : /das/rce/_/sensor
// retrieve resource[object Object]
// get_resource_from_url (SyJqH4A0N): 1.785ms
// app.get  { resource_uri: 'sensor' } (request.paramsにJSON形式で取得される）

// 処理概要：
// resource_uriをキーに、lookupテーブルを検索する
// 一致するものがある場合は、そのレコードのtyを取得する
// tyの種類に応じて、cb/ae/cnt(/acp)のテーブルを選択し、urlがresource_uriと一致する情報をレスポンスとして返す

app.get('/das/rce/_/:resource_uri', function(request, response) {
    console.log('app.get ', request.params);
    console.log(request.params['resource_uri']);
    request.url = request.params['resource_uri'];
    resource.retrieve(request, response, function(err,result){
        if(!err)
	    responder.response_result(request, response, 200, result, 2000, '');
	else
	    responder.error_result(request, response, 500, 5000, result);
    });
});

// (2) /das/rcelist
//
// 全パラメータはオプション！
// ty			リソースタイプ	完全一致
// class		AEのクラス	完全一致
// usr			ユーザＩD	完全一致
// name			表示名		完全一致
// datatype		データ種別	部分一致（ae, cnt)
// type			AEタイプ		完全一致
// pae			親AE		完全一致

// 出力
// {
//   "rces": [
//     {
//        "url": "//kddi.jp/cse-id/cse-base/sensor_ae",
//        "ty": 2,
//        "sri": "S20180417070045277BCV0"
//     },{
//        "url": "//kddi.jp/cse-id/cse-base/sensor_ae/cnt1",
//        "ty": 3,
//        "sri": "cnt001dfrslfa"　　<--- ri(ae: ae-id, cse: cse-id, cnt:rn?)の値を設定する？
//     }
//   ]
// }
// あるいは、urlの一覧を返すか？

app.get('/das/rceList', function(request, response) {
    console.log(request.query); /// ?ty=2&class=24 なら、{ ty: '2', class: '24' }となり、キーを指定して要素を取得可能
    var Object = request.query;
    db_sql.select_reclist(request, function(err, result) {
	if(!err)
		responder.response_result(request, response, 200, result, 2000, '');
	else
		responder.error_result(request, response, 500, 5000, 'Exception Error.');
    });
});

// (3) /das/acp
// trid, orは必須、完全一致をacpテーブルから検索
app.get('/das/acp', function(request, response) {
    console.log('app.get ', request.query);
    // パラメータチェック
    keys = Object.keys(request.query);
    if (!keys || keys.length != 2 || !request.query['trid'] || !request.query['or']) {
        // parameter error
        //	    responder.error_result(request, response, 500, 5000, 'parameter error');
        responder.error_result(request, response, 500, 5000, 'Exception Error.');
        return 0;
    }
    // パラメータチェックOKなので、ACP取得処理
    db_sql.select_acp(request.query['trid'], request.query['or'], function(err, result) {
        // trid/orで指定するデータが存在しない場合、err=null, result=[]がsqlレベルで返る
	console.log(err);
	console.log(result);
        if (!err) {
            responder.response_result(request, response, 200, JSON.stringify(result[0]), 2000, ''); // return ACP info. resultにはacpの検索結果が入ってくる
        } else {
	    console.log('no data found');
            responder.error_result(request, response, 500, 5000, 'Exception Error.');
        }
    });
});

// (4) /das/acplist
// trid, or,usrはオプション、オプションが存在する場合は、完全一致をacpテーブルから検索
app.get('/das/acpList', function(request, response) {
    console.log('app.get ', request.query.params);
    //        console.log(Object.keys(request.query));
    db_sql.select_acplist(request, function(rsc, result) {
        if(!rsc){
            responder.response_result(request, response, 200, result, 2000, ''); // return ACP info. resultにはacpの検索結果が入ってくる
        }else{
	    console.log('no data found');
            responder.error_result(request, response, 500, 5000, 'Exception Error.');
        }
    });
});

// PUT
// リソースの更新

// resource_uriをキーに、lookupテーブルを検索する
// 一致するものがある場合は、そのレコードのtyを取得する
// tyの種類に応じて、cb/ae/cnt(/acp)のテーブルを選択し、urlがresource_uriと一致する情報を更新して、更新した情報をレスポンスとして返す
//

app.put('/das/rce/_/:resource_uri', function(request, response) {
    console.log('app.put ', request.params);
    console.log(request.params['resource_uri']); // JSONの要素を出力する

    get_body_json_data(request, function(err, body_Obj) {
        if (!err) {
            console.log(body_Obj);
            request.url = request.params['resource_uri'];
            request.bodyObj = body_Obj;
            
            resource.update(request, response, function(err, result){
		if(!err){
		    console.log('resouce updated');
                    responder.response_result(request, response, 200, result, 2000, '');
                } else {
		    console.log('resource update failed');
		    body_Obj['dbg'] = 'Exception Error.';
	            responder.error_result(request, response, 500, 5000, body_Obj['dbg']);
                }
            }); // callbackで結果を返すように変更する
        }else{
            console.log('body data is missing');
	    body_Obj['dbg'] = 'Exception Error.';
            responder.error_result(request, response, 500, 5000, body_Obj['dbg']);
	}
    });
});

app.put('/das/acp', function(request, response) {
    console.log('app.put acp update\n');

    get_body_json_data(request, function(err, body_Obj) {
        if (!err) {
            console.log(body_Obj);

            policy_data = body_Obj['policy'];
            if (!body_Obj['trid'] || !body_Obj['or'] || !policy_data) {
                console.log('Mandatory data is missing');
                body_Obj['dbg'] = 'Exception Error.';
                responder.error_result(request, response, 500, 5000, body_Obj['dbg']);
            } else if (!policy_data['acop'] || !policy_data['pl']) {
                console.log('Mandatory acp data is missing');
                body_Obj['dbg'] = 'Exception Error.';
                responder.error_result(request, response, 500, 5000, body_Obj['dbg']);
            }else {
                db_sql.update_acp(body_Obj, function(err, result) {
                    if (!err) {
                        console.log('acp updated!');
                        db_sql.select_acp(body_Obj['trid'], body_Obj['or'], function(err, result) {
                            responder.response_result(request, response, 200, JSON.stringify(result[0]), 2000, '');
                        });
                    } else {
                        console.log('acp update was failed');
	    	        body_Obj['dbg'] = 'Exception Error.';
            	        responder.error_result(request, response, 500, 5000, body_Obj['dbg']);
                    }
                });
            }
        }else{
            console.log('body data is missing');
	    body_Obj['dbg'] = 'Exception Error.';
            responder.error_result(request, response, 500, 5000, body_Obj['dbg']);
	}
    });
});


// DELETE resource
// 処理概要：
// resource_uriをキーに、lookupテーブルを検索する
// 一致するものがある場合は、そのレコードのtyを取得する
// tyの種類に応じて、cb/ae/cnt(/acp)のテーブルを選択し、urlがresource_uriと一致する情報を削除して、削除した情報をレスポンスとして返す

// AEは以下のようなデータを、API上削除時に返信するデータとして作成する必要がある
/*
AE
{
  "url": "//kddi.jp/cse-id/cse-base/sensor_ae",	<- lookupから
  "ty": 2,					<- lookupから
  "sri": "S20180417070045277BCV0",		<- lookupから
  "class":0,					<- 以下は、ae/cnt/cseなどから
  "usr":"USR0001",
  "name":"センサー",
  "datatypes":["DATA001","DATA002"],
  "type":125,
  "policy":[
    {
      "data_id" : "DATA0001",
      "required_flag" : true,
      "purpose" : "PURPOSE01"
     },{
      "data_id": "DATA0003",
      "required_flag" : false,
      "purpose" : "PURPOSE03"
     }
   ]
}

CNT
{
  "url": "//kddi.jp/cse-id/cse-base/sensor_ae/tempareture",	<- lookupから
  "ty": 3,					<- lookupから
  "sri": "S20180417070045277BCV0",		<- lookupから
  "datatypes":["DATA001","DATA002"],
}

CBS
{
  "url": "//kddi.jp/cse-id/cse-base",
  "ty": 5,					<- lookupから
  "sri": "cse-id"
}
*/

app.delete('/das/rce/_/:resource_uri', function (request, response) {
    console.log('app.delete resouce delete',request.params);
    request.url = request.params['resource_uri'];
    console.log(request.params['resource_uri']);  // JSONの要素を出力する
    resource.delete(request, response,function(err,result){
        if(!err){
            responder.response_result(request, response, 200, result, 2000, ''); 
        }else{
            responder.error_result(request, response, 500, 5000, 'Exception Error.');
        }
    });
});

app.delete('/das/acp', function (request, response) {
    console.log('app.delete acp delete ',request.params);
    console.log(request.headers);
    db_sql.select_acp(request.query['trid'], request.query['or'], function(err, result) {
        // trid/orで指定するデータが存在しない場合、err=null, result=[]がsqlレベルで返る
	console.log(err);
	console.log(result);
        if (!err & result.length != 0) {
            db_sql.delete_acp(request.query.trid,request.query.or, function(err, result) {
                if (!err) {
                    // delete したら、deleteしたACPの情報を返す。事前に取得しておく必要がある
                     body_Obj = result;
                     console.log(body_Obj);
                }
            });
            responder.response_result(request, response, 200, JSON.stringify(result[0]), 2000, ''); // return ACP info. resultにはacpの検索結果が入ってくる
        } else {
	    console.log('no data found');
            responder.error_result(request, response, 500, 5000, 'Exception Error.');
        }
    });
});

// 　input parameters in body:
//   Originator-id(or), userId(option), role-id(rlid), role-info(tkis,tkhd(Originator-id),tknd,tkna),access priviledge(option)
//
//   token claimset(payload):
//    vr,tkid,tkis,tkhd,tknb,tkna,tknm(option, token name),tkau(option, audience),tkps(option, permission),tkex(option)
//    what to set in vr is not described.
//    tkid should be created by DAS
//    tkis should be the address (id) of DAS
//    tknb, tkna should be the same value received in input parameters (of role)
//    tknm, optional
//    tkau, optional
//    tkps, (should be set by Role-IDs or/and the access priviledged received in input parameters)
//    tkex, optional
//
//    and when sending/receiving the token data, the format should be converted to oneM2M JWT claim set and ESData protected
//    generated token should be stored in the token repository
//    And when new token for role is created, the access priviledged info received from role issuer should be used to create
//    a new ACP record in ACP table and the target resource of the ACP should be also created in resource table.
//    The sequence should be:
//        1. Servicer ask to regist AE/cnt/cin info for target resource (if not exsists) record in dasdb
//        2. Then create ACP info in dasdb related with the registered target resource and also store role-id (in proper resource table)
//        3. Then create token info related to this role-ids in dasdb (token table)

// Input:
//   Originator id(M), Resource target id(O), Roleids (M)
// Output:
//   token with trids and granted priviledged infos
// Process:
//   Search ACP table with or(m)/rlid(m)
app.post('/das/token', function (request, response) {
    console.log('app.post token create\n');
    
    get_body_json_data(request, function(err, body_Obj) {
	    console.log(typeof(body_Obj));
        console.log('body data =',body_Obj);
	
	if (!err) {
	    or = body_Obj['or'];
	    console.log('originator =', or);
	    roleids = body_Obj['rlids'];
	    console.log('roleids =',roleids);
	    
	    try {
	        db_sql.select_acps_from_roleids(roleids,function(err,result){
		    if(isEmptyObject(result)){
			console.log("no matched ACP data found for roleids about " + filtered_roleids);
			responder.error_result(request, response, 500, 5000, 'No ACP data found in DB.');
                	return 0;
                    }else{
			// send back correct ACP info list
			console.log('result2 =',result);
   		        result_objects = JSON.parse(JSON.stringify(result));
			//			console.log('result_objects = ', result_objects);
			policy_datas = [];
			trids = [];
			for (result_object of result_objects){
			    trid = result_object['trid'];
			    policy_data = JSON.parse(result_object['policy']);  // Add acor
			    delete policy_data['pl'];
			    policy_data['acor'] = [result_object['or']];
			    trids.push(trid);
                            policy_datas.push(policy_data);
			}
			console.log('trids=', trids);
			console.log('policy_datas=', policy_datas);
			// create dai or tokens
			//			console.log('rlid =', result_object['rlid']);
			token.createTokenFromACP(policy_datas,or,trids,'JWE',function(err,result){
/*
			    dres= {};
 			    console.log('token =', result);
			    dres['tkns'] = [result];
			    seci= {};
			    seci['sit'] = 2;	// Dynamic Authorization Response (dres)
			    seci['dres'] = dres;
			    console.log('seci = ',JSON.stringify(seci));
			    final_response = {};
			    final_response['m2m:seci']=seci;
			    //  Send back Notify(dynaAuthDasResponse)
			    responder.response_result(request, response, 200, JSON.stringify(final_response), 2000, '');
			    return 0;
*/
 			    console.log('token =', result);
			    final_result={};
			    final_result['tkid']=result['tkid'];
			    final_result['tkns']=result['tkob'];
			    responder.response_result(request, response, 200, JSON.stringify(final_result), 2000, '');
			    return 0;
			});
		    }
	    	});
	    } catch(e){
		console.log('Role info could not be retreived from given role-id');
		responder.error_result(request, response, 500, 5000, 'No role info data found in DB.');
                return 0;
	    }
//	    onem2m_token = create_onem2m_token();
//	    console.log(onem2m_token);
	}else{
	    // sendback error
	    console.log('invalid json');
	}
    });
});

app.put('/das/token', function (request, response) {
    console.log('app.put token update\n');
    get_body_json_data(request, function(err, body_Obj) {
	if (!err) {
            console.log(body_Obj);
	    
	    created_token = token.create_onem2m_token(body_Obj);
	    
	}
    });
});

app.delete('/das/token', function (request, response) {
    console.log('app.delete token detele\n');
    get_body_json_data(request, function(err, body_Obj) {
	if (!err) {
            console.log(body_Obj);
	    
	    deleted_token = token.delete_token();
	    
	}
    });
});

app.get('/das/token', function (request, response) {
    console.log('app.get token create\n');
    get_body_json_data(request, function(err, body_Obj) {
	if (!err) {
            console.log(body_Obj);
	    
	    retrieve_token = token.retrieve_token();
	    
	}
    });
});

// Originator-idからToken一覧を取得する
app.get('/das/tokenlist', function (request, response) {
    console.log('app.get token list\n');
    get_body_json_data(request, function(err, body_Obj) {
	if (!err) {
            console.log(body_Obj);
	    
	    retrieve_token = token.retrieve_token_list();
	    
	}
    });
});
