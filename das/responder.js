/**
 * Copyright (c) 2019, KDDI Research, Inc.
 * All rights reserved.
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * 3. The name of the author may not be used to endorse or promote products derived from this software without specific prior written permission.
 * THIS SOFTWARE IS PROVIDED BY THE AUTHOR ``AS IS'' AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

var _this = this;

exports.response_result = function(request, response, status, body_Obj, rsc, cap) {
    console.log('response_result');
    request.headers.usebodytype = 'json';
    response.header('Content-Type', 'application/json');
    response.header('x-m2m-ri',request.headers['x-m2m-ri']);
    response.header('x-m2m-rsc', rsc);
    console.log(body_Obj);
    // 以下は、JSON形式のデータで、"\"や"\[","]\"などの余計なエスケープを削除するため。
    // エラーメッセージに関しては、replaceコマンドは不要。あるいは、文字列化する？
    body_Obj1 = body_Obj.replace(/\\/g, "").replace(/\"\{/g, "{").replace(/\}\"/g, "}");
    console.log(body_Obj1);
    response.status(status).end(body_Obj1);  // こっちは、サーチ時の出力

    /*
    body_Obj1 = body_Obj.replace(/\\/g, "");
    console.log(body_Obj1);
    new_body_Obj1 = body_Obj1.replace(/\"\{/g, "{");
    new_body_Obj2 = new_body_Obj1.replace(/\}\"/g, "}");
    console.log(new_body_Obj2);
    response.status(status).end(new_body_Obj2);  // こっちは、サーチ時の出力
*/
};

exports.error_result = function(request, response, status, rsc, dbg_string) {

    var body_Obj = {};
    body_Obj['dbg'] = dbg_string;
    response.header('x-m2m-ri',request.headers['x-m2m-ri']);
    response.header('x-m2m-rsc', rsc);
    response.status(status).end(body_Obj);
//    response.status(status).send(dbg_string);
    //    _this.response_result(request, response, status, body_Obj, rsc, request.url, body_Obj['dbg']);
};
