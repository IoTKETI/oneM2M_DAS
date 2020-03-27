/**
 * Copyright (c) 2019, KDDI Research, Inc.
 * All rights reserved.
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * 3. The name of the author may not be used to endorse or promote products derived from this software without specific prior written permission.
 * THIS SOFTWARE IS PROVIDED BY THE AUTHOR ``AS IS'' AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

//var responder = require('./responder');
var moment = require('moment');
var util = require('util');
//var merge = require('merge');
//var fs = require('fs');

var db = require('./db_action');

var _this = this;
// 以下の２つのフラグはglobal変数にする
var bq_flg = "`";
var sq_flg = "'";

//global.max_lim = 1000;

// MYSQLのチューニング
exports.set_tuning = function(callback) {
    var sql = util.format('set global max_connections = 2000');
    db.getResult(sql, '', function (err, results) {
        if(err) {
            //callback(err, results);
            //return;
            console.log(results.message);
        }
        sql = util.format('set global innodb_flush_log_at_trx_commit=0');
        db.getResult(sql, '', function (err, results) {
            if(err) {
                //callback(err, results);
                //return;
                console.log(results.message);
            }
            sql = util.format('set global sync_binlog=0');
            db.getResult(sql, '', function (err, results) {
                if(err) {
                    //callback(err, results);
                    //return;
                    console.log(results.message);
                }
                sql = util.format('set global transaction_isolation=\'READ-UNCOMMITTED\'');
                db.getResult(sql, '', function (err, results) {
                    if(err) {
                        //callback(err, results);
                        //return;
                        console.log(results.message);
                    }
                    callback(err, results);
                });
            });
        });
    });
};


//
// まず、マスターであるlookupテーブルにinsert_lookup()でデータを追加する（全てのリソース：acp,cs,ae,cnt(tokenは別途管理用テーブルが必要かも）
// リソースの追加が成功したら、db.getResult()にsql文を引数として渡し、各リソーステーブルに受信データを追加する
// 各リソーステーブルの追加が成功したら、正常終了し、追加が失敗したら、lookupテーブルに追加したリソースデータを削除する。（CSEのリソースIDはどうする？）
// riを使用してlookupテーブルにアクセスしているが、DASはriの代わりにurlを利用する！

////////////////////////// DB Table info ////////////////////////////////////
/*
■lookup				
カラム	日本語名	例					PK	外部key
url	URL		//kddi.jp/cse-id/cse-base/sensor_ae	○	
ty	リソースタイプ	2		
sri	リソースID	rkm3nZ7m3G		
ct	作成日時			
lt	更新日時				

■cb				
カラム	日本語名	例					PK	外部key
url	URL		//kddi.jp/cse-id/cse-base		○	○
rn	リソース名	cse-base		
csi	CSE-ID		/cse-id

■ae				
カラム		日本語名	例					PK	外部key
url		URL		//kddi.jp/cse-id/cse-base/sensor_ae	○	○
rn		リソース名	sensor_ae
aei		AE-ID		S20180417070045277BCV0
class		AEの種類	サービス or デバイス
usr		user_id		user_idを格納（デバイス時）
name		表示名		サービス名、デバイスの表示名
datatypes	データ種別ID	取得するデータID
type		サービスの種類	0～359
policy		ポリシー	"{
  ""policy"": [
    {
      ""data_id"" : ""DATA0001"",
      ""required_flag"" : true,
      ""purpose"" : ""PURPOSE01""
    },{
      ""data_id"": ""DATA0003"",
      ""required_flag"" : false,
      ""purpose"" : ""PURPOSE03""
    }
  ]
}"		

■cnt				
カラム		日本語名	例						PK	外部key
url		URL		//kddi.jp/cse-id/cse-base/sensor_ae/humidity	○	○
rn		リソース名	humidity
datatypes	データ種別ID	データ種別ID
pae		親AE		//kddi.jp/cse-id/cse-base/sensor_ae

■acp				
カラム		日本語名		例			PK	外部key
trid		対象のリソース					○	○
or		リクエスト元					○	○
policy
    acop		許可オペレーション
    pl		有効時間
    actw		accessControWindow アクセス制御時間帯
    acip_ipv4	accessControlIpAddresses
    acip_ipv6	accessControlIpAddresses
    aclr		accessControlLocationRegion
    acaf		accessControlAuthenticationFlag
ct		作成日時
lt		更新日時
usr		ユーザID
role id		ロールID

■token
カラム		日本語名		例			PK	外部key
tkid		トークンID					○	○
or		リクエスト元					○	○
tkob		トークンオブジェクト				
payload		トークンPayload（JSON形式）
user		user_id
*/

////////////////////////// Table info ////////////////////////////////////

// lookupテーブルについて

exports.insert_lookup = function(obj, callback) {
    console.log('insert_lookup ');
    // resourceの情報をlookupテーブルに格納する
    var ct = moment().utc().format('YYYY-MM-DD HH:mm:ss');
    var lt = ct;
    var sql = util.format('insert into lookup ' +
//        'values (\'%s\', \'%s\', \'%s\', \'%s\', \'%s\', \'%s\')',
//        obj.url, obj.ty, obj.sri, ct, lt, obj.or);
        'values (\'%s\', \'%s\', \'%s\', \'%s\', \'%s\')',
        obj.url, obj.ty, obj.sri, ct, lt);
    db.getResult(sql, '', function (err, results) {
        if(!err) {
//            set_sri_sri(obj.ri, obj.sri, function (err, results) {
                //console.log('insert_lookup ' + obj.ri);
                callback(err, results);
//            });
        }
        else {
            callback(err, results);
        }
    });
};

// INSERT
exports.insert_acp = function(obj, callback) {
    console.log('insert_acp ');
    var ct = moment().utc().format('YYYY-MM-DD HH:mm:ss');
    var lt = ct;

            var sql_str = "";
            var value_str = "";
            bq_flg = "`";
            sq_flg = "'";
    acp_keys = ['trid', 'or', 'sri', 'policy', 'usr','rlid'];
            for(var param_name in obj){
                if(acp_keys.includes(param_name)){
		    console.log(param_name);

                    if (!sql_str )
                        if(param_name == 'or')
			        sql_str = "insert into acp (" + bq_flg + param_name + bq_flg;
                        else
				sql_str = "insert into acp (" + param_name ;
                    else
                        if(param_name == 'or')
			        sql_str = sql_str + "," +  bq_flg + param_name + bq_flg ;
			else
	                        sql_str = sql_str + "," + param_name;

                    if(!value_str)
                        if(param_name == 'policy'){
	                        value_str = " value (" + sq_flg + JSON.stringify(obj[param_name]) + sq_flg;
                        }else{
	                        value_str = " value (" + sq_flg + obj[param_name] + sq_flg;
                        }
                    else
                        if(param_name == 'policy'){
	                        value_str = value_str + ","  + sq_flg + JSON.stringify(obj[param_name]) + sq_flg;
                        }else{
                        	value_str = value_str + "," + sq_flg + obj[param_name] + sq_flg;
                        }
                }
            }
            sql_str = sql_str + ",ct,lt)";
            value_str = value_str + ","+ sq_flg +ct +sq_flg + ","+ sq_flg +lt +sq_flg + ")";
            sql = sql_str + value_str;
            console.log(sql);
/*
    var sql = util.format('insert into acp ' +
        'value (\'%s\', \'%s\', \'%s\', \'%s\', \'%s\', \'%s\')',
         obj.trid, obj.or, JSON.stringify(obj.policy), ct, lt, obj.usr);
    console.log(sql);
*/
    db.getResult(sql, '', function (err, results) {
            console.log(err);
            console.log(results);
            console.log('insert_acp ' + obj.trid);
            callback(err, results);
    });
};


// insert_ae関数内で、insert_into_lookup/delete from lookup するのはどうかと。
exports.insert_ae = function(obj, callback) {
     console.log('insert_ae ');

    _this.insert_lookup(obj, function (err, results) {
        if(!err) {

            // optionパラメータに対応すること（必須パラメータ：url, rn, aei、それ以外はオプション）
            // 
            var sql_str = "";
            var value_str = "";
            bq_flg = "`";
            sq_flg = "'";
            ae_keys = ['url', 'rn', 'sri', 'class', 'usr', 'name', 'datatypes', 'type', 'policy'];
            for(var param_name in obj){
                if(ae_keys.includes(param_name)){
		    console.log(param_name);

                    if (!sql_str )
                        if(param_name == 'sri')
			        sql_str = "insert into ae (" + "aei" ;
                        else
				sql_str = "insert into ae (" + param_name ;
                    else
                        if(param_name == 'sri')
			        sql_str = sql_str + "," +  "aei" ;
			else
	                        sql_str = sql_str + "," + param_name;


                    if(!value_str)
                        if(param_name == 'datatypes' || param_name == 'policy'){
	                        value_str = " value (" + sq_flg + JSON.stringify(obj[param_name]) + sq_flg;
                        }else{
	                        value_str = " value (" + sq_flg + obj[param_name] + sq_flg;
                        }
                    else
                        if(param_name == 'datatypes' || param_name == 'policy'){
	                        value_str = value_str + ","  + sq_flg + JSON.stringify(obj[param_name]) + sq_flg;
                        }else{
                        	value_str = value_str + "," + sq_flg + obj[param_name] + sq_flg;
                        }
                }
            }
            sql_str = sql_str + ")";
            value_str = value_str + ")";
            sql = sql_str + value_str;
            console.log(sql);
/*
            var sql = util.format('insert into ae (url, rn, aei, class, usr, name, datatypes, type, policy) ' +
                'value (\'%s\', \'%s\', \'%s\', \'%s\', \'%s\', \'%s\', \'%s\', \'%s\', \'%s\')',
                obj.url, obj.rn, obj.sri, obj.class, obj.usr, obj.name, JSON.stringify(obj.datatypes), obj.type, JSON.stringify(obj.policy));

            console.log(sql);
*/
            db.getResult(sql, '', function (err, results) {
                if(!err) {
		    console.log(results);
                    console.log('insert_ae ' + obj.sri);
                    callback(err, obj);
                }
                else {
                    sql = util.format("delete from lookup where ri = \'%s\'", obj.sri);
                    db.getResult(sql, '', function () {
                    });
                    callback(err, results);
                }
            });
        }
        else {
            console.log('insert_lookup failed');
            callback(err, results);
        }
    });
};

// insert_cnt関数内で、delete from lookup するのはどうかと。
exports.insert_cnt = function(obj, callback) {
    console.log('insert_cnt ');
    _this.insert_lookup(obj, function (err, results) {
        if(!err) {
	    // optionパラメータに対応すること（必須パラメータは、url, rn, cnti、但しpaeはurlから取得。datatypesのみオプション）
            var sql_str = "";
            var value_str = "";
            bq_flg = "`";
            sq_flg = "'";
            ae_keys = ['url', 'rn', 'sri','datatypes', 'pae'];
            for(var param_name in obj){
                if(ae_keys.includes(param_name)){
		    console.log(param_name);

                    if (!sql_str )
                        if(param_name == 'sri')
			        sql_str = "insert into cnt (" + "cnti" ;
                        else
				sql_str = "insert into cnt (" + param_name ;
                    else
                        if(param_name == 'sri')
			        sql_str = sql_str + "," +  "cnti" ;
			else
	                        sql_str = sql_str + "," + param_name;


                    if(!value_str)
                        if(param_name == 'datatypes'){
	                        value_str = " value (" + sq_flg + JSON.stringify(obj[param_name]) + sq_flg;
                        }else{
	                        value_str = " value (" + sq_flg + obj[param_name] + sq_flg;
                        }
                    else
                        if(param_name == 'datatypes'){
	                        value_str = value_str + ","  + sq_flg + JSON.stringify(obj[param_name]) + sq_flg;
                        }else{
                        	value_str = value_str + "," + sq_flg + obj[param_name] + sq_flg;
                        }
                }
            }
            sql_str = sql_str + ")";
            value_str = value_str + ")";
            sql = sql_str + value_str;
            console.log(sql);
/*

            var sql = util.format('insert into cnt (url, rn, cnti, datatypes, pae) ' +
                'value (\'%s\', \'%s\', \'%s\', \'%s\')',
                obj.url, obj.rn, obj.sri, obj.datatypes, obj.pae);

            console.log(sql);
*/

            db.getResult(sql, '', function (err, results) {
                if(!err) {
                    console.log('insert_cnt ' + obj.sri);
                    callback(err, results);
                }
                else {
                    sql = util.format("delete from lookup where ri = \'%s\'", obj.sri);
                    db.getResult(sql, '', function () {
                        callback(err, results);
                    });
                }
            });
        }
        else {
            callback(err, results);
        }
    });
};


exports.insert_cb = function(obj, callback) {
    console.log('insert_cb ');
    _this.insert_lookup(obj, function (err, results) {
        if(!err) {
            var sql = util.format('insert into cb (' +
                'url, rn,  csi) ' +
                'value (\'%s\', \'%s\', \'%s\')',
				  obj.url, obj.rn, obj.sri);
            db.getResult(sql, '', function (err, results) {
                if(!err) {
                    console.log('insert_cb ' + obj.ri);
                    callback(err, results);
                }
                else {
                    // 
                    sql = util.format("delete from lookup where ri = \'%s\'", obj.ri);
                    db.getResult(sql, '', function () {
                        callback(err, results);
                    });
                }
            });
        }
        else {
            callback(err, results);
        }
    });
};
// SELECT

// like検索はdataset必要かどうかは微妙。
/*
exports.select_csr_like = function(cb, callback) {
    var sql = util.format("select * from csr where ri like \'/%s/%%\'", cb);
    db.getResult(sql, '', function (err, results_csr) {
        if (!Array.isArray(results_csr.poa)) {
            results_csr.poa = [];
        }
        callback(err, results_csr);
    });
};
*/
// Dynamic Authorization APIは、テーブルアクセスはACPのテーブルを参照するだけ。
// lookup tableからurlに一致するレコードを取得
// このtyをキーにして、削除テーブルを決定する→パスを解析してリソースが決定できるロジックがあれば、そのロジックを利用する手もある。

exports.select_lookup = function(uri, callback) {
    console.log('select_lookup');
    var sql = util.format("select * from lookup where url = \'%s\'", uri);
    console.log(sql);
    db.getResult(sql, '', function (err, results) {
        console.log(results['ty']);
        callback(err, results);
    });
};

exports.select_ty_lookup = function(uri, callback) {
    console.log('select_ty_lookup');
    var sql = util.format("select ty from lookup where url = \'%s\'", uri);
    db.getResult(sql, '', function (err, results) {
        callback(err, results);
    });
};

exports.select_acp = function(trid, or, callback) {
    console.log('select_acp');
    var sql = util.format("select * from acp where trid = \'%s\' and " + "`" + "or"+ "`"+" = \'%s\'", trid, or);
    console.log(sql);
    db.getResult(sql, '', function (err, results) {
        console.log(err);
        console.log(results);
        callback(err, results);
    });
};

// get all acps related to all roleids
// and include all of them into 
exports.select_acps_from_roleids = function(roleids, callback) {
    console.log('select_acps_from_roleids');
    sq_flg = "'";
    roleids_str ="";
    for (roleid of roleids){
	console.log('roleid = ', roleid);
	if(roleids_str.length == 0)
            roleids_str = "where rlid in (" +sq_flg+ roleid + sq_flg;
	else
	    roleids_str = roleids_str + "," +sq_flg+roleid+sq_flg;
	
	console.log("roleids_str =",roleids_str);
    }

    roleids_str = roleids_str + ")";
    console.log("roleids_str =",roleids_str);
	var sql = util.format("select * from acp " + roleids_str);
    	console.log(sql);
        db.getResult(sql, '', function (err, results) {
            console.log(err);
	    console.log(results);
            callback(err, results);
        });
};

exports.select_acp_from_roleid = function(roleid, callback) {
    console.log('select_acp_from_roleid');
    var sql = util.format("select * from acp where rlid = \'%s\'", roleid);
    console.log(sql);
    db.getResult(sql, '', function (err, results) {
        console.log('err =', err);
        console.log('results = ',results[0]);
        callback(err, results);
    });
};

function isEmptyObject(obj){
  return !Object.keys(obj).length;
}

exports.select_acplist = function(request , callback) {
    // trid, or, usrは全てオプション。存在する場合は、完全一致。
    // orはSQL文では予約語なので、"`"で囲む必要がある
    // データの値も「'」で囲む必要あり
    console.log('select_acplist');

    data_params = request.query;
    console.log(!isEmptyObject(data_params));

        sql = "select trid,"+ "`" + "or"+ "`"+" from acp";
        where = "";
        bq_flg = "`";
        sq_flg = "'";
        for(var param_name in data_params){
            if(!where){
                where = " where "+ bq_flg + param_name + bq_flg + " = " + sq_flg + data_params[param_name] + sq_flg;
            }
            else{
                where = where + " and " + bq_flg + param_name + bq_flg + " = " + sq_flg + data_params[param_name] + sq_flg;
            }
        }
        sql = sql + where;
        console.log(sql);
        db.getResult(sql, '', function (err, results) {
            data_list=JSON.parse(JSON.stringify(results));
            console.log(data_list);
            var newHashmap = {};
            newHashmap["acps"] = data_list;
            console.log('response_data =',newHashmap);
            callback(0, JSON.stringify(newHashmap));
        });
};

exports.select_rec = function(uri, table, callback) {
    console.log('select_rec');
    var sql = util.format("select * from "+ table + " where url = \'%s\'", uri);
    console.log(sql);
    db.getResult(sql, '', function (err, results) {
        console.log(err);
        console.log(results[0]);
        callback(err, results);
    });
};

// 受信したデータのフィールド名とDBの列名が異なるケースがあるので、注意。特に、sriはそれぞれ、csi、aei、cntiに変換してDBに保持する。また、結果表示の際は、逆変換が必要。
exports.select_reclist  = function(request , callback) {
    // ty, class,usr, name, datatype(ae,cnt用）, type, pae((aeおよび)cnt検索用？AEの親もAEの可能性はある)は全てオプション。存在する場合は、datatype以外は完全一致。
    // SQL文では予約語をフィールド名で利用する場合は、"`"で囲む必要がある
    // データの値も「'」で囲む必要あり
    console.log('select_reclist');

    ty = request.query['ty'];
//    console.log(ty);
    if( ty == null ){
       console.log('ty is not defined');
    }

//    0.ty=ae/cnt/cseの場合は、各テーブルを参照して、オプションパラメータと一致するデータを取得する。余計なオプションパラメータは無視。
//     ty=2:aeのケースは、class,name,datatype, type,policyをチェック
//     ty=3:cntのケースは、datatype,paeのみチェック
//     ty=5:CSEのケースは、オプションパラメータは無視。
//    1.それ以外のty値は、検索せずに、空リストを返す
//    2.tyが存在しないケース
//    - class, name, datatype, type, policyのいずれかが存在する場合は、AEテーブルをチェック
//    - datatype, paeが存在する場合は、cntテーブルをチェック
//    *datatypeは、2つのテーブルをチェックして、結果をマージする必要がある。
//    3.全パラメータが存在しない場合は、lookupテーブルから全件を返す
//    4.検索結果が0個の場合は空リストを返す(ty=2,3,5以外なども含む）

    ae_params = ['class','name','datatype', 'type','policy'];
    cnt_params = ['datatype', 'pae'];

    data_params = request.query;
    console.log(data_params);

    if(ty == 2){
        console.log('Search from ae');
        sql = "select url,aei from ae";
        // オプションデータをwhere文でつなげる
        where = "";
	if(data_params){
            for(var param_name in data_params){ // key:value pairのkeyを取得
		if(ae_params.includes(param_name)){　// keyがオプションパラメータに含まれるか検査
                        operator = " = ";
                        param_data = data_params[param_name];
                        console.log(param_data);
                        if(param_name == 'datatype'){
			    // 部分一致
　　　　　　　　　　　　　　operator = " like ";
                            param_name = 'datatypes';
			}
//                	if(!where){
//	                        console.log(param_data);
//                    	    where = " where "+"`"+ param_name +"`"+ operator + "'" +param_data+"'";
//                	}
//                	else{
//                    	    where = where + " and "+"`" + param_name +"`"+ operator + "'" +param_data+"'";
//                	}
                	if(!where){
			    if(param_name == 'datatypes')
                                where = " where "+"`"+ param_name +"`"+ operator + "'" + "%"+ param_data + "%"+"'";
                            else
                       	        where = " where "+"`"+ param_name +"`"+ operator + "'" + param_data +"'";
                	}
                	else{
			    if(param_name == 'datatypes')
                                where = where + " and "+"`" + param_name +"`"+ operator + "'" + "%"+ param_data + "%"+"'";
                            else
                    	        where = where + " and "+"`" + param_name +"`"+ operator + "'" + param_data +"'";
                	}
            	}
            }
	}
        sql = sql + where;
        console.log('sql = ', sql);
    	db.getResult(sql, '', function (err, results) {
            data_list=JSON.parse(JSON.stringify(results));
            var response_data = [];
	    data_list.forEach(function(data) {
	        var newHashmap = {};
	        Object.keys(data).forEach(function(key){
    		    var value = data[key];
		    console.log(key);
		    if(key == 'url'){
			newHashmap[key] = value;
			newHashmap['ty'] = ty;
		    }else if (key == 'aei'){
			newHashmap['sri'] = value;
    		    }
	        });
                response_data.push(newHashmap);
            });
            console.log(response_data);
            var newHashmap = {};
            newHashmap["rces"] = response_data;
            console.log('response_data =',newHashmap);
            callback(0, JSON.stringify(newHashmap));
        });
    }
    else if ( ty == 3 ){
        console.log('Search from cnt');
        sql = "select url,cnti from cnt";
        // オプションデータをwhere文でつなげる

        where = "";
	if(data_params){
            for(var param_name in data_params){ // key:value pairのkeyを取得
		if(cnt_params.includes(param_name)){　// keyがオプションパラメータに含まれるか検査
                        operator = " = ";
                        param_data = data_params[param_name];
                        console.log(param_data);
                        if(param_name == 'datatype'){
			    // 部分一致
　　　　　　　　　　　　　　operator = " like ";
                            param_name = 'datatypes';
			}
                	if(!where){
			    if(param_name == 'datatypes')
                                where = " where "+"`"+ param_name +"`"+ operator + "'" + "%"+ param_data + "%"+"'";
                            else
                       	        where = " where "+"`"+ param_name +"`"+ operator + "'" + param_data +"'";
                	}
                	else{
			    if(param_name == 'datatypes')
                                where = where + " and "+"`" + param_name +"`"+ operator + "'" + "%"+ param_data + "%"+"'";
                            else
                    	        where = where + " and "+"`" + param_name +"`"+ operator + "'" + param_data +"'";
                	}
            	}
            }
	}
        sql = sql + where;
        console.log('sql = ', sql);
    	db.getResult(sql, '', function (err, results) {
	    // ここで結果が空の場合や、エラーの場合の処理を追加
            data_list=JSON.parse(JSON.stringify(results));
            var response_data = [];
	    data_list.forEach(function(data) {
	        var newHashmap = {};
	        Object.keys(data).forEach(function(key){
    		    var value = data[key];
		    console.log(key);
		    if(key == 'url'){
			newHashmap[key] = value;
			newHashmap['ty'] = ty;
		    }else if (key == 'cnti'){
			newHashmap['sri'] = value;
    		    }
	        });
                response_data.push(newHashmap);
            });
            console.log(response_data);
            var newHashmap = {};
            newHashmap["rces"] = response_data;
            console.log('response_data =',newHashmap);
            callback(0, JSON.stringify(newHashmap));
        });
    }
    else if ( ty == 5 ){
        console.log('Search from cb');
        sql = "select url,csi from cb";
    	db.getResult(sql, '', function (err, results) {
            data_list=JSON.parse(JSON.stringify(results));
            var response_data = [];
	    data_list.forEach(function(data) {
	        var newHashmap = {};
	        Object.keys(data).forEach(function(key){
    		    var value = data[key];
		    console.log(key);
		    if(key == 'url'){
			newHashmap[key] = value;
			newHashmap['ty'] = ty;
		    }else if (key == 'csi'){
			newHashmap['sri'] = value;
    		    }
	        });
                response_data.push(newHashmap);
            });
            console.log(response_data);
            var newHashmap = {};
            newHashmap["rces"] = response_data;
            console.log('response_data =',newHashmap);
            callback(0, JSON.stringify(newHashmap));
        });
    }
    else if( ty == null ) { // tyが無い場合は、lookupテーブルから全データを取得する 
        console.log('Search from lookup');
        sql = "select url,ty,sri from lookup";
        var response_data = [];
    	db.getResult(sql, '', function (err, results) {
            response_data=JSON.parse(JSON.stringify(results));
            console.log(typeof(response_data));
            console.log(response_data);
            var newHashmap = {};
            newHashmap["rces"] = response_data;
            console.log('response_data =',newHashmap);
            callback(0, JSON.stringify(newHashmap));
        });
    }else{
        console.log('Illegal ty value');
        body_Obj = {};
	body_Obj['dbg'] = 'Exception Error.';
	callback(1,body_Obj['dbg'] );
    }
};


exports.select_cb = function(uri, callback) {
    var sql = util.format("select * from cb where url = \'%s\'", uri);
    db.getResult(sql, '', function (err, results) {
        callback(err, results);
    });
};

exports.select_ae = function(uri, callback) {
    var sql = util.format("select * from ae where url = \'%s\'", uri);
    db.getResult(sql, '', function (err, results) {
        callback(err, results);
    });
};

exports.select_cnt = function(uri, callback) {
    var sql = util.format("select * from cnt where url = \'%s\'", uri);
    db.getResult(sql, '', function (err, results) {
        callback(err, results);
    });
};

// 更新

exports.update_cs = function (obj, callback) {
    callback(1, 'CSE can not be updated');
}

// lookupテーブルの日時更新
function update_lookup_lt_date(obj, callback) {
    var lt = moment().utc().format('YYYY-MM-DD HH:mm:ss');
    var sql = util.format('update lookup set lt = \'%s\' where url = \'%s\'', obj.url, lt);
    db.getResult(sql, '', function (err, results) {
        console.log('update_lookup ' + obj.url);
        callback(err, results);
    });
};

// データのエラーチェックを完全にやっていない（オプションパラメータ）
// trid,or以外はオプション。更新の際は、ltも現在の日時に更新する。
exports.update_acp = function (obj, callback) {
    console.log('update_acp ' + obj.ri);

    var lt = moment().utc().format('YYYY-MM-DD HH:mm:ss');

    var sql = util.format('update acp set usr = \'%s\', policy = \'%s\', lt = \'%s\' where `trid` = \'%s\' and `or` = \'%s\'',
       obj.usr, JSON.stringify(obj.policy), lt, obj.trid, obj.or);
    // sqlに返されたstatus codeやデータなどを元に検索結果を解析する
    console.log(sql);

    // データが存在しない場合でも、updateはエラーが返らない！
    db.getResult(sql, '', function (err, results) {
           if (!err && results.length != 0) {
            console.log(err);
            console.log(results);
               // UpdateしたACPの最新情報を返信(Retrieveすること
               console.log('acp data updated');
	       callback(0, results);
           } else {
            console.log(err);
            console.log(results);
               console.log('acp update failed...');
               callback(1, results);
           }
    });
};

exports.update_ae = function (obj, callback) {
    console.log('update_ae');
    console.log(obj);
/*
    var sql = util.format('update ae set class = \'%s\', usr = \'%s\', name = \'%s\', datatypes = \'%s\', type = \'%s\', policy = \'%s\' where url = \'%s\'',
       obj.class, obj.usr, obj.name, JSON.stringify(obj.datatypes), obj.type, JSON.stringify(obj.policy), obj.url);

    console.log(sql);
*/
            var sql_str = "";
            var value_str = "";
            bq_flg = "`";
            sq_flg = "'";
            ae_keys = ['url', 'class', 'usr', 'name', 'datatypes', 'type', 'policy'];
            for(var param_name in obj){
                if(ae_keys.includes(param_name)){
		    console.log(param_name);

                    if(!sql_str){
                        if(param_name == 'datatypes' || param_name == 'policy'){
	                        sql_str = "update ae set " + param_name + "=" +  sq_flg + JSON.stringify(obj[param_name]) + sq_flg;
                        }else{
	                        sql_str = "update ae set " + param_name + "=" + sq_flg + obj[param_name] + sq_flg;
                        }
                    }else{
                        if(param_name == 'datatypes' || param_name == 'policy'){
	                        sql_str = sql_str + ","  + param_name + "=" + sq_flg + JSON.stringify(obj[param_name]) + sq_flg;
                        }else{
                        	sql_str = sql_str + "," + param_name + "=" + sq_flg + obj[param_name] + sq_flg;
                        }
                    }


                    if(!value_str){
                        if(param_name == 'url'){
	                        value_str = " where "+ param_name + "=" + sq_flg + obj[param_name] + sq_flg;
			}
                    }
                }
            }
            sql = sql_str + value_str;
            console.log(sql);

    db.getResult(sql, '', function (err, results) {
        if (!err) {
            console.log('ae data updated');
            update_lookup_lt_date(obj, function(err, results) {
                console.log('lookup table updated');
	        callback(err, results);
	    });
        } else {
            console.log(err);
            console.log(results);

            console.log('ae data updated failed....');
            callback(err, results);
        }
    });

};

exports.update_cnt = function (obj, callback) {
    console.log('update_cnt');

    if(!obj['datatypes']){
	console.log('No parameter for update');
        callback(1,'No parameter for update');
        return;
    }

    var sql = util.format('update cnt set datatypes = \'%s\' where url = \'%s\'',
       obj.datatypes, obj.url);
    db.getResult(sql, '', function (err, results) {
        if (!err) {
            console.log('container data updated');
            update_lookup_lt_date(obj, function(err, results) {
                console.log('lookup table updated');
	        callback(err, results);
	    });
        } else {
            console.log('container data updated failed....');
            callback(err, results);
        }
    });
};

// 削除
exports.delete_lookup = function (uri, callback) {
    var sql = util.format("DELETE FROM lookup WHERE url = \'%s\'", uri);
    //console.log(sql);
    db.getResult(sql, '', function (err, results) {
        callback(err, results);
    });
};

/* (delete_lookupで代用）
exports.delete_rce = function (uri, table, callback){
    var sql = util.format("DELETE FROM "+table+" WHERE url = \'%s\'", uri);
    //console.log(sql);
    db.getResult(sql, '', function (err, results) {
        // DELETE時も削除した情報を返す（削除前にgetして、返信用のデータを用意しておく必要がある）
        // DELETEに失敗した場合は、その旨エラーを返す（HTTP Error code = 500)
        callback(err, results);
    });
};
*/
exports.delete_acp = function (trid, or, callback){
    var sql = util.format("DELETE FROM acp where trid = \'%s\' and " + "`" + "or"+ "`"+" = \'%s\'", trid, or);
    console.log(sql);
    db.getResult(sql, '', function (err, results) {
        // DELETE時も削除した情報を返す（削除前にgetして、返信用のデータを用意しておく必要がある）
        // DELETEに失敗した場合は、その旨エラーを返す（HTTP Error code = 500)
        callback(err, results);
    });
};

exports.insert_token = function(obj, callback) {
    console.log('insert_token ');

            var sql_str = "";
            var value_str = "";
            bq_flg = "`";
            sq_flg = "'";
    acp_keys = ['tkid', 'or', 'tkob', 'payload', 'usr'];
            for(var param_name in obj){
                if(acp_keys.includes(param_name)){
		    console.log(param_name);

                    if (!sql_str )
                        if(param_name == 'or')
			        sql_str = "insert into token (" + bq_flg + param_name + bq_flg;
                        else
				sql_str = "insert into token (" + param_name ;
                    else
                        if(param_name == 'or')
			        sql_str = sql_str + "," +  bq_flg + param_name + bq_flg ;
			else
	                        sql_str = sql_str + "," + param_name;

                    if(!value_str)
                        if(param_name == 'payload'){
	                        value_str = " value (" + sq_flg + JSON.stringify(obj[param_name]) + sq_flg;
                        }else{
	                        value_str = " value (" + sq_flg + obj[param_name] + sq_flg;
                        }
                    else
                        if(param_name == 'payload'){
	                        value_str = value_str + ","  + sq_flg + JSON.stringify(obj[param_name]) + sq_flg;
                        }else{
                        	value_str = value_str + "," + sq_flg + obj[param_name] + sq_flg;
                        }
                }
            }
            sql_str = sql_str + ")";
            value_str = value_str + ")";
            sql = sql_str + value_str;
            console.log(sql);

    db.getResult(sql, '', function (err, results) {
            console.log(err);
            console.log(results);
            console.log('insert_token ' + obj.trid);
            callback(err, results);
    });
};

exports.update_token = function(obj, callback) {
    console.log('Token can not be updated');
    callback(1, 'Token can not be updated');
}

exports.delete_token = function(obj, callback) {
    console.log(obj);
        var sql = util.format("DELETE FROM token where tkid = \'%s\' and " + "`" + "or"+ "`"+" = \'%s\'", tkid, or);
    console.log(sql);
    db.getResult(sql, '', function (err, results) {
        // DELETE時も削除した情報を返す（削除前にgetして、返信用のデータを用意しておく必要がある）
        // DELETEに失敗した場合は、その旨エラーを返す（HTTP Error code = 500)
        callback(err, results);
    });
}

exports.select_tokens_from_tokenids = function(tokenids, callback) {
    console.log('select_tokens_from_tokenid');

    sq_flg = "'";
//    comma = ",";
    tokenids_str ="";
    for (tokenid of tokenids){
	if(tokenids_str.length == 0)
//            tokenids_str = "where tkid in ('" + tokenid + "'";
            tokenids_str = "where tkid in (" +sq_flg + tokenid + sq_flg;
	else
	    //	    tokenids_str = tokenids_str + "," + "'"+ tokenid+"'";
	    tokenids_str = tokenids_str + "," + sq_flg + tokenid + sq_flg;
    }

    tokenids_str = tokenids_str + ")";
    console.log("tokenids_str =",tokenids_str);
	var sql = util.format("select tkob from token " + tokenids_str);
    	console.log(sql);
        db.getResult(sql, '', function (err, results) {
            console.log(err);
	    console.log(results);
            callback(err, results);
        });
};

exports.select_token = function(tokenid, callback) {
    console.log(tokenid);
    var sql = util.format("SELECT tkob FROM token where tkid = \'%s\'", tkid);
    console.log(sql);
    db.getResult(sql, '', function (err, results) {
	console.log(results);
        callback(err, results);
    });
}

// get tokens list using Originator id and role ids
exports.select_tokenlist = function(obj, callback) {
}

// get roleids from Originator id
exports.select_roleid_list = function(obj, callback){
}

// get acp info from roleids
exports.retrieve_tokens_from_roleids = function(obj, callback){
}
