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
//var querystring = require("querystring");
//var StringDecoder = require('string_decoder').StringDecoder;
//var decoder = new StringDecoder('utf8');
var express = require('express');
var bodyParser = require('body-parser');
var morgan = require('morgan');
//var util = require('util');
var url = require('url');
var ip = require('ip');
//var crypto = require('crypto');
var fileStreamRotator = require('file-stream-rotator');
//var merge = require('merge');
var https = require('https');
//var moment = require('moment');
var responder = require('./das/responder');
var resource = require('./das/resource');
//var db = require('./das/db_action');
//var db_sql = require('./das/sql_action');
var app = express();

var logDirectory = __dirname + '/log';

// ensure log directory exists
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);

// create a rotating write stream
// Number of das could be generated. The log file should be changed to be unique by each DAS-AE
var accessLogStream = fileStreamRotator.getStream({
    date_format: 'YYYYMMDD',
    filename: logDirectory + '/access-das-%DATE%.log',
    frequency: 'daily',
    verbose: false
});

// setup the logger
app.use(morgan('combined', {stream: accessLogStream}));

console.log('Start DAS-AE!');

//    db.connect(usedbhost, 3306, 'root', usedbpass, function (rsc) {
//        if (rsc == '1') {
                if(use_secure === 'disable') {
                    http.createServer(app).listen({port: usedasaebaseport, agent: false}, function () {
                        console.log('das-ae (http) (' + ip.address() + ') running at ' + usedasaebaseport + ' port');
                    });
                }
                else {
                    var options = {
                        key: fs.readFileSync('server-key.pem'),
                        cert: fs.readFileSync('server-crt.pem'),
                        ca: fs.readFileSync('ca-crt.pem')
                    };
                    https.createServer(options, app).listen({port: usedasaebaseport, agent: false}, function () {
                        console.log('das-ae (https) (' + ip.address() + ') running at ' + usedasaebaseport + ' port');
                    });
                }
//        }
//    });

      console.log('DAS-AEID=',usedasaeid);

// CORS対応
app.use(function (req, res, next) {
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

function get_body_json_data2(request, callback){

    var fullBody = '';
    request.on('data', function (chunk) {
        fullBody += chunk.toString();
    });
    console.log(fullBody);
    request.on('end', function () {
        if (fullBody == "") {
            callback(1,'body is empty');
            return '0';
        }
        body_Obj = JSON.parse(fullBody.toString());
        callback(0,body_Obj);
    });
}

function get_abs_address_in_http( orig_address, spid, cseid, csebase, callback){

    if( orig_address.substring(0,7) == 'http://' ){
        //  http://[server_name]:[port_id/が付いている
        domain_address = orig_address.substring(0, orig_address.indexOf('/',7));
        // addresの先頭は/ or // or /~/ or /_/ のいずれか
        address = orig_address.replace(domain_address,'');
	console.log('domain address =', domain_address);
    }else{
        // addressの先頭は'/'なし or / or // or /~/ or /_/ のいずれか (http://[server_name]:[port_id/が付いていない）
        address = orig_address;
    }

    // structured or unstructured
    if(address.indexOf(csebase)!= -1){
	console.log('Structured');
    }else{
	console.log('Unstructured');
    }

    if( address.indexOf('/_/') != -1){
        console.log('Absolute (oneM2M)');
        address1 = address.replace('/_/','//');
        abs_address = address1;
    }else if( address.substr(0,2) == '//') {
        console.log('Absolute(http)');
        abs_address = address;
    }else if(address.indexOf('/~/') != -1){
	console.log('SP-Relative (oneM2M)');
        address1 = spid + address.replace('/~','');
        abs_address = address1;
    }else if(address.indexOf(cseid)!= -1){
	console.log('SP-Relative(http)');
        abs_address = spid + address;
    }else if ( address.substr(0,1) == '/') {
        console.log('CSE-Relative(oneM2M)');
        abs_address = spid + cseid + address;
    }else{
        console.log('CSE-Relative(http)');
        abs_address = spid + cseid + '/' + address;
    }

    console.log('original address =',address);
    console.log('converted to (http) ',abs_address);
    callback(0,abs_address)
}

function get_abs_address_in_onem2m(orig_address, spid, cseid, csebase, callback){
    if( orig_address.substring(0,7) == 'http://' ){
        //  http://[server_name]:[port_id/が付いている
        domain_address = orig_address.substring(0, orig_address.indexOf('/',7));
        // addresの先頭は/ or // or /~/ or /_/ のいずれか
        address = orig_address.replace(domain_address,'');
    }else{
        // addressの先頭は'なし' or / or // or /~/ or /_/ のいずれか (http://[server_name]:[port_id/が付いていない）
        address = orig_address;
    }

    // structured or unstructured
    if(address.indexOf(csebase)!= -1){
	console.log('Structured');
    }else{
	console.log('Unstructured');
    }
    spid = spid.replace('//','/_/');
    console.log('spid =', spid);
    
    if( address.indexOf('/_/') != -1){
        console.log('Absolute (oneM2M)');
        abs_address = address;
    }else if( address.substr(0,2) == '//') {
        console.log('Absolute(http)');
        address1 = address.replace('//','/_/');
        abs_address = address1;
    }else if(address.indexOf('/~/') != -1){
	console.log('SP-Relative (oneM2M)');
        address1 = spid + address.replace('/~','');
        abs_address = address1;
    }else if(address.indexOf(cseid)!= -1){
	console.log('SP-Relative(http)');
        abs_address = spid + address;
    }else if ( address.substr(0,1) == '/') {
        console.log('CSE-Relative(oneM2M)');
        abs_address = spid + cseid + address;
    }else{
        console.log('CSE-Relative(http)');
        abs_address = spid + cseid + '/' + address;
    }
    console.log('original address =',address);
    console.log('converted to (oneM2M) ',abs_address);
    callback(0,abs_address)
}

// CSEなどからpostを受信したら、アドレスをチェック。（チェック対象のパラメータを抜き出す）
// Absoluteでない場合は、Absoluteに変換後、DASにWebAPIで送信する
// DASから結果を受信したら、アドレスをチェックして、CSEに結果を送り返す

app.post('/das/dynaAuth', function (request, response) {
    console.log('app.post dynamicacpinfo\n',request.params);
    response_info={};
    get_body_json_data(request, function(err, body_Obj) {
        if (!err) {
            console.log(request.headers);
	    body_data1= body_Obj['m2m:seci'];
	    console.log(body_data1);
	    body_data= body_data1['dreq'];
//	    body_data = body_Obj['m2m:seci']['dreq'];
    	    for (key in body_data) {
               if(key == 'op' && body_data[key] != 5){
	           error = "NG:operation of the request is not NOTIFY.";
                   responder.error_result(request, response, 500, 5000, error);
                   return 0;
	       }

               if(key == 'or' && body_data[key]){
                   console.log('original url=',body_data[key]);
		   /*
                   get_abs_address_in_onem2m(body_data[key], usespid, usecseid, usecsebase, function(rsc,result){
                        console.log(result);
                        body_data[key] = result;                        
                   });
		   */
		   get_abs_address_in_http(body_data[key], usespid, usecseid, usecsebase, function(rsc,result){
                        console.log(result);
                        body_data[key] = result;
                   });
               }
           }  // for in body_data
           // send modified data to DAS server
           // DASのアクセス情報を設定）
           console.log(body_data);
           console.log(typeof(body_data));

           qs_data = JSON.stringify(body_Obj);

           console.log(qs_data);
           console.log(typeof(qs_data));

           console.log(request.headers);
           console.log(typeof(request.headers));
           qs_headers = JSON.stringify(request.headers);

           var options = {
               hostname: usedashost,
               port: usedasport,
               path: '/das/dynaAuth',
               method: 'POST',
               headers: {
	           'X-M2M-Origin': usedasaeid,
       		   'Content-Type': 'application/json',
    		   'X-M2M-RI': request.headers['x-m2m-ri'],
       		   'Content-Length': Buffer.byteLength(qs_data)
	       },
               body: qs_data,
               json: true
           };
           console.log('options = ',options);
            var req = http.request(options, function(res) {  // Response from DAS

               console.log("STATUS: ", res.statusCode);
               console.log("HEADERS: ", JSON.stringify(res.headers));
               res.setEncoding('utf8');
               res.on('data', function(chunk){
                   console.log("BODY: ", chunk);
		   response.header('x-m2m-ri',request.headers['x-m2m-ri']);
		   response.header('x-m2m-rsc', res.headers['x-m2m-rsc']);
		   response.status(res.statusCode).send(chunk);

		       /*
                   if(res.statusCode != 200) {
                       body_Obj = {};
                       body_Obj['dbg'] = chunk;
                       responder.error_result(request, response, 500, 5000, body_Obj['dbg']);
                       return 0;
                   }
                   var rcv_json = JSON.parse(chunk);
                   console.log(rcv_json);
		   responder.response_result(request, response, 200, JSON.stringify(rcv_json), 2000, '');
		   */
              });
              // 応答終了処理
              res.on('end', function(){
//                  console.log('No more data');
              });
           });
           // 送信のエラー処理
           req.on('error', function(e){
               console.log( "エラー発生: ", e.message);
               body_Obj = {};
               body_Obj['dbg'] = chunk;
               responder.error_result(request, response, 500, 5000, body_Obj['dbg']);
           });
           // データ送信(GET)
           req.write(qs_data);
           req.end();
       }else{
            console.log('body data is missing');
	    body_Obj['dbg'] = 'Exception Error.';
            responder.error_result(request, response, 500, 5000, body_Obj['dbg']);
            return 0;
	}
    });
});

app.post('/das/dasAE', function(request, response) {

            console.log('create DAS AE');
            var app_name = 'DAS_AE';

            // create unique resource_name
            var resource_name;
            usespid_str = usespid.substring(2);
            dn = usespid_str.split('.');
            console.log(dn[0]);
            now_obj = new Date();
            date_str_wk = now_obj.toDateString(); // "Wed Jul 28 1993"
            date_str = date_str_wk.replace(/\s+/g, ""); // "WedJul281993"
            num = Math.floor(Math.random() * 100) + 1;
            var ret = ('000' + num).slice(-3);
            resource_name = 'das_' + dn[0] + '_' + date_str + ret;

            var json_data = {
                "m2m:ae": {
                    "api": app_name,
                    "rn": resource_name,
                    "rr": false
                }
            }
            console.log(json_data);
            qs_data = JSON.stringify(json_data);

            path = '/' + usecsebase;
/*
            console.log(usespid);
            console.log(usecsehost);
            console.log(usecseport);
            console.log(path);
            console.log(usedasaeid);
*/
	    console.log('Current das AEID =',usedasaeid);

            // CSE（Ocean）のアクセス情報を設定）
            var options = {
                hostname: usecsehost,
                port: usecseport,
                path: path,
                method: 'POST',
                headers: {
//                    'X-M2M-Origin': usedasaeid,
                    'X-M2M-Origin': 'S',
                    'Content-Type': 'application/json;ty=2',
                    'X-M2M-RI': '2020',
                    'Content-Length': Buffer.byteLength(qs_data)
                },
                body: qs_data,
                json: true
            };

            // リクエスト定義と応答処理設定
            var req = http.request(options, function(res) {
                console.log("STATUS: ", res.statusCode);
                console.log("HEADERS: ", JSON.stringify(res.headers));
                res.setEncoding('utf8');

                if (res.statusCode == '201')
                    console.log('Created!');
                else if (res.statusCode == '409') { // 既にAEが存在する
                    console.log('Conflicted!');
		    body_Obj={};
		    body_Obj['dbg']='DAS AE creation failed';
		    responder.error_result(request, response, 409, 4000, body_Obj['dbg']);
                    return;
                } else {
                    console.log('Internal server error');
		    body_Obj={};
		    body_Obj['dbg']='Internal server error';
                    responder.error_result(request, response, 500, 5000, body_Obj['dbg']);
                    return;
                }

                // 応答受信処理
                res.on('data', function(chunk) {
                    console.log("BODY: ", chunk);
                    var rcv_json = JSON.parse(chunk);
                    console.log(rcv_json["m2m:ae"]);
                    data = rcv_json["m2m:ae"];
                    console.log("aeid = ", data["aei"]);
                    console.log("rn = ", data["rn"]);
                    console.log("ri = ", data["ri"]);

                    var file_data = fs.readFileSync('conf-ae.json', 'utf-8');
                    //        console.log(typeof(file_data));
                    var conf = JSON.parse(file_data);
                    conf.dasaeid = data["aei"];
                    conf.dasaern = data["rn"];
                    //        console.log(conf);
                    //        console.log(typeof(conf));
                    var conf_str = JSON.stringify(conf, undefined, 4);
                    //        console.log(typeof(conf_str));
                    //        console.log(conf_str);
                    fs.writeFileSync('conf-ae.json', conf_str);
                    console.log("DAS-AE configuration info updated!");
		    responder.response_result(request, response, 200, JSON.stringify(rcv_json), 2000, '');
                });
                // 応答終了処理
                res.on('end', function() {
                    //        console.log('No more data');
                });
            });
            // 送信のエラー処理
            req.on('error', function(e) {
                console.log("エラー発生: ", e.message);
		body_Obj={};
		body_Obj['dbg']='Internal server error';
                responder.error_result(request, response, 500, 5000, body_Obj['dbg']);
            });
            // データ送信(GET)
            req.write(qs_data);
            req.end();
}); // end of /das/dasAE
