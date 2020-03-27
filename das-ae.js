/**
 * Copyright (c) 2019, KDDI Research, Inc.
 * All rights reserved.
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * 3. The name of the author may not be used to endorse or promote products derived from this software without specific prior written permission.
 * THIS SOFTWARE IS PROVIDED BY THE AUTHOR ``AS IS'' AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

var fs = require('fs');
var data = fs.readFileSync('conf-ae.json', 'utf-8');
var conf = JSON.parse(data);

global.defaultbodytype      = 'json';

// DAS-AE information
 global.usedasaeid	    = conf.dasaeid;
 global.usedasaern	    = conf.dasaern;
 global.usedasaebaseport    = conf.dasaebaseport;

// DAS information
 global.usedashost	    = 'localhost';
 global.usedasport	    = '7580';

// CSE information
 global.usecsehost           = 'ppmoceankato.japaneast.cloudapp.azure.com';
 global.usecseport           = '7579';
// global.usespid              = '//sample.a';
// global.usecseid             = '/mb-cse-a';
// global.usecsebase           = 'mb-base-a';
 global.usespid              = '//kddi.jp';
 global.usecseid             = '/cse-id';
 global.usecsebase           = 'cse-base';

 global.use_secure           = 'disable';

// Call DAS-AE core
require('./app-ae');
