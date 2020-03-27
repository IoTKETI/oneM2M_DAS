/**
 * Copyright (c) 2019, KDDI Research, Inc.
 * All rights reserved.
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * 3. The name of the author may not be used to endorse or promote products derived from this software without specific prior written permission.
 * THIS SOFTWARE IS PROVIDED BY THE AUTHOR ``AS IS'' AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

var url = require('url');
var http = require('http');
var https = require('https');
var moment = require('moment');
var fs = require('fs');
var responder = require('./responder');
var db_sql = require('./sql_action');
var _this = this;

table_name_list = {1:"acp",2:"ae",3:"cnt",4:"cnti",5:"cb"};

exports.remove_no_value = function (request, resource_Obj) {
    console.log('remove no value');

    var rootnm = request.headers.rootnm;

    for (var index in resource_Obj[rootnm]) {
        if (resource_Obj[rootnm].hasOwnProperty(index)) {
            if (request.hash) {
                if (request.hash.split('#')[1] == index) {

                }
                else {
                    delete resource_Obj[rootnm][index];
                }
            }
            else {　// 以下、resourceのtype checkをしているが、boolean型と、number型は処理が一緒なので、まとめられる。
                if (typeof resource_Obj[rootnm][index] === 'boolean') {
                    resource_Obj[rootnm][index] = resource_Obj[rootnm][index].toString();
                }
                else if (typeof resource_Obj[rootnm][index] === 'string') {
                    if (resource_Obj[rootnm][index] == '' || resource_Obj[rootnm][index] == 'undefined' || resource_Obj[rootnm][index] == '[]') {
                        if (resource_Obj[rootnm][index] == '' && index == 'pi') {
                            resource_Obj[rootnm][index] = null;
                        }
                        else {
                            delete resource_Obj[rootnm][index];
                        }
                    }
                }
                else if (typeof resource_Obj[rootnm][index] === 'number') {
                    resource_Obj[rootnm][index] = resource_Obj[rootnm][index].toString();
                }
            }
        }
    }
};

function regist_rec(ty,object,callback) {
    console.log('regist_rec');

    if (ty == '1') {
        console.log('acp regist');
        db_sql.insert_acp(object, function (err, results) {
            callback(err, results);
        });
    }else if (ty == '2') {
        console.log('ae regist');
        db_sql.insert_ae(object, function (err, results) {
            callback(err, results);
        });
    }else if (ty == '3') {
        console.log('container regist');
        db_sql.insert_cnt(object, function (err, results) {
            console.log(err);
            console.log(results);
            callback(err, results);
        });
    }else if (ty == '5') {
        console.log('CSE regist');
        db_sql.insert_cb(object, function (err, results) {
            console.log(err);
            console.log(results);
            callback(err, results);
        });
    }else {
        body_Obj = {};
        body_Obj['dbg'] = "ty is not supported";
        callback(1, body_Obj['dbg']);
    }
}
/*
function regist_action(request, response, ty, resource_Obj, callback) {
    console.log('regist_action');
*/
exports.regist = function (request, response, callback) {
    console.log('create');

    var body_Obj = {};
    resource_Obj = request.bodyObj;
    ty = request.bodyObj.ty;
    url = request.bodyObj.url;
    console.log(resource_Obj);

    regist_rec(ty,resource_Obj,function(err,result){
        if(!err){
            get_rec(ty, url, function(err, result) {
                if(!err) {
                    console.log('resource retrieved');
                    console.log(result);
        	    callback(0, result);
                }else{
		    console.log('resource retrieve failed...');
                    var body_Obj = {};
                    body_Obj['dbg'] = 'resource retreive failed...';
                    callback(1, body_Obj['dbg']);
                    return;
                }
            });
        }else{
            if (results.code == 'ER_DUP_ENTRY') {
                body_Obj = {};
                body_Obj['dbg'] = "resource (" + resource_Obj[rootnm].rn + ") is already exist";
            } else {
                body_Obj = {};
                body_Obj['dbg'] = '[regist_action] ' + result.message;
            }
            callback(1, body_Obj['dbg']);
        }
    });
}
/*
exports.regist = function (request, response, callback) {
	console.log('create');
        regist_action(request, response, request.bodyObj.ty, request.bodyObj, function (err, result) {
            callback(err,result);
        });
};
*/

function get_rec(ty, url, callback) {
    console.log('get resource');

            var create_Obj = {};

            db_sql.select_rec(url, table_name_list[ty], function(err, results) {
                console.log(results);
                if (!err) {
                    // resource毎に応答時に送信するデータを作成する(他のリソース関連のAPIでも、一覧表示以外は共通）
                    console.log('results',results);
                    hashmap = JSON.parse(JSON.stringify(results[0]));
                    var newHashmap = {};

                    if (ty == '2') {
                        console.log("get ae info");
                        Object.keys(hashmap).forEach(function(key) {
                            var value = hashmap[key];
                            console.log(key);
                            if (key == 'url') {
                                newHashmap[key] = value;
                                // urlのデータの次に、tyを追加
                                newHashmap['ty'] = ty;
                            } else if (key == 'rn') {

                            } else if (key == 'aei') {
                                newHashmap['sri'] = value;
                            } else {
                                newHashmap[key] = value;
                            }
                        });
			console.log(typeof(newHashmap));
                        str = JSON.stringify(newHashmap);
                        str1 = str.replace(/"\[/g,'[');
                        create_Obj = str1.replace(/\]"/g,']');
                        console.log(create_Obj);
                        callback(0, create_Obj);
                    } else if (ty == '3') {
                        console.log("get container info");
                        Object.keys(hashmap).forEach(function(key) {
                            var value = hashmap[key];
                            console.log(key);
                            if (key == 'url') {
                                newHashmap[key] = value;
                                newHashmap['ty'] = ty;
                            } else if (key == 'pae' || key == 'rn') {

                            } else if (key == 'cnti') {
                                newHashmap['sri'] = value;
                            } else {
                                newHashmap[key] = value;
                            }
                        });
                        create_Obj = JSON.stringify(newHashmap);
                        console.log(create_Obj);
                        callback(0, create_Obj);
                    } else if (ty == '5') {
                        console.log("get cse info");
                        Object.keys(hashmap).forEach(function(key) {
                            var value = hashmap[key];
                            console.log(key);
                            if (key == 'url') {
                                newHashmap[key] = value;
                                newHashmap['ty'] = ty;
                            } else if (key == 'csi') {
                                newHashmap['sri'] = value;
                            }
                        });
                        create_Obj = JSON.stringify(newHashmap);
                        console.log(create_Obj);
                        callback(0, create_Obj);
                    }
                } else {
                    /*  resoureテーブルに存在しない場合、エラーを返す */
                    console.log('select resource error');
                    var body_Obj = {};
                    body_Obj['dbg'] = search_Obj.message;
                    callback(1, body_Obj['dbg']);
                }
            });
}

/*
function retrieve_action(request, response, callback) {
    console.log('retrieve_action');    // 引数のuriをキーに、lookupテーブルで一致するレコードを探す
*/
exports.retrieve = function (request, response,callback) {
    console.log('retrieve');
    db_sql.select_lookup(request.url,function (err, search_Obj) {
        console.log(err);
        console.log(search_Obj);

        if (!err && search_Obj.length != 0) {
	    rows=JSON.parse(JSON.stringify(search_Obj[0]));
            console.log(rows.ty);
            ty = rows.ty;

            get_rec(ty, request.url, function(err, result) {
                if(!err) {
                    console.log('resource retrieved');
                    console.log(result);
        	    callback(0, result);
                }else{
		    console.log('resource retrieve failed...');
                    var body_Obj = {};
                    body_Obj['dbg'] = 'resource retreive failed...';
                    callback(1, body_Obj['dbg']);
                    return;
                }
            });
        }else{
            callback(1, "resouce not found in the lookup table");
        }
    });
}
/*
exports.retrieve = function (request, response,callback) {
	console.log('retrieve');

            retrieve_action(request, response, function (err, result) {
                callback(err,result);
            });
};
*/
function update_rec(ty, object, callback){
    console.log('update_rec');

    if (ty == '2') {
	console.log('update ae');
        db_sql.update_ae(object, function (err, result) {
            if (!err) {
		console.log('ae updated');
                callback(0,result);
	    } else {
		body_Obj = {};
                body_Obj['dbg'] = result.message;
                callback(1, resource_Obj);
            }
        });
    } else if (ty == '3') {
	console.log('update container');
        db_sql.update_cnt(object, function (err, result) {
            if (!err) {
		console.log('container updated');
                callback(0,result);
	    } else {
		body_Obj = {};
                body_Obj['dbg'] = result.message;
                callback(1, resource_Obj);
            }
        });
    } else if (ty == '5') {  // CSEBase
	console.log('update CSEBase');
        db_sql.update_cse(object, function (err, result) {
            if (!err) {
		console.log('container updated');
                callback(0,result);
	    } else {
		body_Obj = {};
                body_Obj['dbg'] = result.message;
                callback(1, resource_Obj);
            }
        });
    } else {
        body_Obj = {};
        body_Obj['dbg'] = "ty is not supported";
        callback(1, body_Obj['dbg'] );
    }
}

// リソースのUpdateが完了したら、lookupテーブルの当該エントリーの更新日時を書き換える
/*
function update_action(request, response, ty, callback) {
*/
exports.update = function (request, response, callback) {
    var body_Obj = {};
    console.log('update_action');
    db_sql.select_lookup (request.url,function (err, search_Obj) {
        if (!err && search_Obj.length != 0) {
	    console.log(search_Obj);
	    rows=JSON.parse(JSON.stringify(search_Obj));
            console.log("ty = " + rows[0].ty);
            ty=rows[0].ty;

            update_Obj = request.bodyObj;
	    update_Obj.url = request.url;
	    console.log(update_Obj);
	    update_rec(ty,update_Obj,function(err,result){
		if(!err){
                    console.log('resource updated');
                    console.log(result);
                    get_rec(ty, request.url, function(err, result) {
                        if(!err) {
                            console.log('resource retrieved');
                            console.log(result);
        	            callback(0, result);
                        }else{
		            console.log('resource retrieve failed...');
                            var body_Obj = {};
                            body_Obj['dbg'] = 'resource retreive failed...';
                            callback(1, body_Obj['dbg']);
                        }
                    });
		}else{
                    console.log('resource update failed...');
                    var body_Obj = {};
                    body_Obj['dbg'] = 'resource update failed...';
                    callback(1, body_Obj['dbg']);
                }
            });
        } else {
            console.log('resource update failed...');
            var body_Obj = {};
            body_Obj['dbg'] = 'Exception Error.';
            callback(1, body_Obj['dbg']);
        }
    });
}

/*
// Updateは受信したデータを使って、そのままデータを更新する。→オプションパラメータがあるので、NG
exports.update = function (request, response, callback) {

    update_action(request, response, request.ty, function (err, result) {
        callback(err,result);
    });
};
*/

/*
function delete_action(request, response, callback) {
    console.log('delete action');
*/
exports.delete = function (request, response,callback) {
    console.log('delete');

    // まず、lookup/ae(cnt)テーブルから、urlに対応するtyを取得する
    db_sql.select_lookup(request.url, function(err, search_Obj) {
        if (search_Obj.length != 0 && !err) {
            console.log(search_Obj);
            // uriが存在したら、そのレコードのtyの値から検索先のテーブルを決定する
            rows = JSON.parse(JSON.stringify(search_Obj[0]));
            ty = rows.ty;

            get_rec(ty, request.url, function(err, result) {
                if(!err) {
                    console.log('resource retrieved');
                    console.log(result);
	            db_sql.delete_lookup(request.url, function(err, search_Obj) {
	                if (!err) { // lookupテーブルから削除OK（自動的にリソーステーブルからも削除される）
        	            callback(0, result);
                	} else { // delete lookupでエラーが返った場合
                    	    var body_Obj = {};
                    	    body_Obj['dbg'] = 'delete lookup failed...';
                    	    callback(1, body_Obj['dbg']);
                	}
            	    });
                }else{
		    console.log('resource retrieve failed...');
                    var body_Obj = {};
                    body_Obj['dbg'] = 'resource retreive failed...';
                    callback(1, body_Obj['dbg']);
                    return;
                }
            });
        } else {
            console.log('resource delete failed');
            var body_Obj = {};
            body_Obj['dbg'] = 'Exception Error.';
            callback(1, body_Obj['dbg']);
        }
    });
}

/*
exports.delete = function (request, response,callback) {

        delete_action(request, response, function (err, result) {
            callback(err,result);
        });
};
*/
