var jose = require('jose');
//const base64url = require('base64url');
var responder = require('./responder');
var resource = require('./resource');
var db = require('./db_action');
var db_sql = require('./sql_action');
const shortid = require('shortid');
const fs = require('fs');

// Asymmetric/Symmetric keys should be generated and stored in the keyfiles/key table.
// Asymmetric: Public key of CSE(ID)ublic+private keys of DAS
// Symmetric: Key phrase(common key) for CSE/DAS

function generate_symmetric_key(){
}

function generate_asymmetric_key(){
}

// 

// The tokenObject stored in the token repository is in the JWT(no algo)/JWS/JWE format.
// The claim sets should be adhering to the oneM2M JWT claim set format.

// if role issuer want to create token related to a certain role, it should use create/regist token API.
// if role-ids received from AE (new API to issue a token/tokenid), DAS should get all the ACP info related to the role-ids and store them into token(s) and send them back to AE.
// if role-ids received from CSE (dynaAuthDasRequest), DAS shoule get all the role-ids related to the Originator (AE) and get the AND of the role-ids, then send back the token with new role-ids list to CSE 

// Create token using role info received from role issuer (Create token API could be used)

function create_token_for_roleid(originatorID, targetResourceidID, roleID, accessControlInfo){
    // input parameter should be role-ids
    // get ACP info related to all role-ids
    // Simple call ACP info create request
    create_acpinfo_in_acptable(originatorID, targetResourceidID, roleID, accessControlInfo); // usr info= null, originatorID and roleID should be set in the acp info table. accessControlInfo should at least include ocop.
    tokenid = create_token_from_acpinfo(originatorID, targetResourceidID, roleID, accessControlInfo);
    // Return tokenObject including tokenids
}
// Can be use Retrieve token API
// Retreive tokenObjects/tokenids related to certain role-ids
// in phase3, Originator will ask DAS to issue/retreive tokens/tokenids.
function retrieve_acps_from_roleids(roleids){
    var acps = [];
    for(var roleid in roleids){
        acp = db_sql.select_acp_from_roleid(roleid);
	acps.push(acp);
    }
    console.log('acps = ', acps);
    return acps;
}

// Retreive tokenObjets from token table which is matched with tokenid/option parameters
// each token info includes tokenObject,tokenid,originator-id
// The response sendback in dynaAuthDasResponse()
function retrieve_token_from_tokenid(tokenids){
    var tokens = [];
    for (var tokenid of tokenids){
	token = db_sql.select_token(tokenid);
	tokens.push(token);
    }
    console.log('tokens = ', tokens);
    return tokens;
}

// How to check the token type
function check_token_type(token){
    dot = '.';
    token_components = token.split(dot);
    console.log(token_components[2]);
    num_of_dots = token.split(dot).length - 1;
    if(num_of_dots==2)
	if(!token_components[2]) // the third component is null for unsecured JWT.
	    console.log('unsecured JWT');
    //    else if (num_of_dots==2)
        else
	    console.log('JWS');
    else if (num_of_dots==4)
	console.log('JWE');
}

// DAS-AE's AD-ID, Domain,CSEBase(global.usespid+ usecsebase + / + aeid

function create_token_id(){
    uniq_str = shortid.generate();
    // date
    uniq_id = 'token_'+uniq_str + '_' +Date.now().toString();
    domain_name = usespid.substring(2);
    token_id = uniq_id+'@'+domain_name; 
    console.log(token_id);
    return token_id;
}

function get_timestr_from_now(add_second = 0){
    
    var d_str = "";
    
//    date_str = new Date(Date.now()+(add_second*1000));
    date_str = new Date(Date.now()+(add_second*10000));
    d = date_str.toISOString();  // extended format string
    d1 = d.replace(/[-:.Z]/g,'');
    d_str = d1.substring(0,15);
    return d_str;
}

// Created token should be stored in the token table
exports.createTokenFromACP = function(acrs, originator_id, target_ids, token_type='JWT',callback){
    
    vr = '1.0'; // fixed value
    tkid = create_token_id();
    tkis = usespid + usecseid + '/' + usecsebase + '/' + usedasaeid; //example.net/myCSE/-/exampleDAS'; // das-ae id (read from das-ae setup file)
    tkhd = originator_id;// Originator id
    tknb = get_timestr_from_now(0);
    tkna = get_timestr_from_now(3600);
    tknm = 'access token for ' +  originator_id;
    tkau = [usespid + usecseid]; // list of CSEID absolute (HCSE) - current CSE info
    tkps = {
        'pm': [{
            'ris': target_ids,
            'pv': acrs
	    // ,'rids': []
        }]
    };
    console.log('tkps =', JSON.stringify(tkps));
    tkex = 'This is a token claimset created by DAS';
/*
    onem2m_claimset = {vr,
		tkid,
		tkis,
		tkhd,
		tknb,
		tkna,
		tknm,
		tkau,
		tkps,
		tkex
		      };
    console.log('token claimset= ', onem2m_claimset);
    payload = convert_onem2m_token_to_JWT(onem2m_claimset);
*/
    payload = {
		vr,
		tkid,
		tkis,
		tkhd,
		tknb,
		tkna,
		tknm,
		tkau,
		tkps,
		tkex
    };
    console.log('JWT payload=', payload);
    header = get_header(token_type);
    key = get_key(token_type);  // should be read from the file
    protected_token = encode_token(token_type, header, payload, key);
    // store token data into token table
    // create sql command
    var token_info_obj={};
    token_info_obj['tkid']=tkid;
    token_info_obj['or']=tkhd;
    token_info_obj['payload']=payload;
    token_info_obj['tkob']=protected_token;
    console.log(token_info_obj);
    // if insertion failed, error should be send back
    db_sql.insert_token(token_info_obj,function(err,result){
	if(err){
	    console.log("token registration failed");
	    responder.error_result(request, response, 500, 5000, 'Failed to save token in DB.');
            return 0;
	}else{
	    console.log('token =', protected_token);
	    //            return protected_token;
	    // decoded_token = decode_token(token_type, protected_token, key);
	    //	    callback(0,protected_token);
	    callback(0,token_info_obj);
        }
    }); // store in token table
}

// Convert the format of token claimsets from m2m:tokenClaimSet to oneM2M JWT claim set
// re-mapping between the items names and convert date format
// JWT/JWE/JWS‚Ì‹æ•Ê‚ÍA.‚Ì”‚ÍAunsecured JWT=1(alg=none),JWE=4,JWS=2

function sample_onem2m_claimset() {
    vr = '1.0';
    tkid = 'token0001@example.net';// Unique id (nanoid) https://www.memory-lovers.blog/entry/2019/07/15/073000
    tkis = '//example.net/myCSE/-/exampleDAS';
    tkhd = '//sample.jp/otherCSE/sampleAE';
    tknb = '20200129T120145';
    tkna = '20210129T120145';
    tknm = 'token_for_roleid0001';
    tkau = ['//oneService.jp/CSE0001'];
    tkps = {
        'pm': [{
            'ris': ['//example.net/myCSE/-/exampleDAS/token0003', '//example.net/myCSE/-/exampleDAS/token0011'],
            'pv': [{
                'acor': ['//sample.jp/otherCSE/sampleAE'],
                'acop': 63,
                'acco': {
                    'actw': ["* 0-5 2,6,10 * * * *"],
                    'acip': {
                        'ipv4': ['192.168.11.2', '168.60.4.0/255.255.255.16']
                    },
                    'aclr': {}
                },
                'acaf': 'TRUE'
            }],
            'rids': []
        }]
    };
    tkex = 'This is a sample claimset';
    claimset = {vr,
		tkid,
		tkis,
		tkhd,
		tknb,
		tkna,
		tknm,
		tkau,
		tkps,
		tkex
	       };
    return claimset;
}

function sample_JWT_claimset() {
    var claimset = {};
    vr = '1.0';
    tkid = 'token0001@example.net';
    tkis = '//example.net/myCSE/wdc_base/exampleDAS';
    tkhd = '//sample.jp/otherCSE/sampleAE';
    tknb = 1580266905;
    tkna = 1611889305;
    tknm = 'token_for_roleid0001';
    tkau = ['https://oneService.jp/CSE0001'];
    tkps = {
        'pm': [{
            'ris': ['//example.net/myCSE/wdc_base/cnt1'],
            'pv': [{
                'acor': ['//sample.jp/otherCSE/sampleAE'],
                'acop': 63,
                'acco': {
                    'actw': ["* 0-5 2,6,10 * * * *"],
                    'acip': {
                        'ipv4': ['192.168.11.2', '168.60.4.0/255.255.255.16']
                    },
                    'aclr': {}
                },
                'acaf': 'TRUE'
            }],
            'rids': []
        }]
    };
    tkex = 'This is a sample claimset';
    claimset = {
        vr,
        tkid,
        tkis,
        tkhd,
        tknb,
        tkna,
        tknm,
        tkau,
        tkps,
        tkex
    };
    return claimset;
}
/*  TS-0003 has mis-definition.
function sample_JWT_claimset(){
    var claimset = {};

    vr = '1.0';
    jti = 'token0001@example.net';
    iss = '//example.net/myCSE/-/exampleDAS';
    azp = '//sample.jp/otherCSE/sampleAE';
    nbf =  1580266905;
    exp =  1611889305;
    tknm = 'token_for_roleid0001';
    aud = [ 'https://oneService.jp/CSE0001' ];
    tkps = {
        'pm': [{
            'ris': ['//example.net/myCSE/-/exampleDAS/token0003', '//example.net/myCSE/-/exampleDAS/token0011'],
            'pv': [{
                'acor': ['//sample.jp/otherCSE/sampleAE'],
                'acop': 63,
                'acco': {
                    'actw': ["* 0-5 2,6,10 * * * *"],
                    'acip': {
                        'ipv4': ['192.168.11.2', '168.60.4.0/255.255.255.16']
                    },
                    'aclr': {}
                },
                'acaf': 'TRUE'
            }],
            'rids': []
        }]
    };
    tkex = 'This is a sample claimset';
 
    claimset = {vr,
		jti,
		iss,
		azp,
		nbf,
		exp,
		tknm,
		aud,
		tkps,
		tkex
	       };
    return claimset;
}
*/

function convert_onem2m_token_to_JWT(onem2m_claimsets){
    var JWT_claimsets= {};
     
    for (var key in onem2m_claimsets){
	if(key == 'vr' || key == 'tknm' || key == 'tkps' || key == 'tkex'){
	    JWT_claimsets[key]=onem2m_claimsets[key];
	}
	if(key == 'tkid'){
	    new_key = 'jti';
	    JWT_claimsets[new_key]=onem2m_claimsets[key];
	}
	if(key == 'tkis'){
	    new_key = 'iss';
	    JWT_claimsets[new_key]=onem2m_claimsets[key];
	}
	if(key == 'tkhd'){
	    new_key='azp';
	    JWT_claimsets[new_key]=onem2m_claimsets[key];
	}
	if(key == 'tknb'){
	    new_key='nbf';
	    // convert to unix seconds
	    rq_time = onem2m_claimsets[key];
	    date = new Date(rq_time.substring(0,4),rq_time.substring(4,6)-1,rq_time.substring(6,8),rq_time.substring(9,11),rq_time.substring(11,13),rq_time.substring(13));
	    JWT_claimsets[new_key]=date/1000;
	}
	if(key == 'tkna'){
	    new_key='exp';
	    // convert to unix seconds
	    rq_time = onem2m_claimsets[key];
	    date = new Date(rq_time.substring(0,4),rq_time.substring(4,6)-1,rq_time.substring(6,8),rq_time.substring(9,11),rq_time.substring(11,13),rq_time.substring(13));
	    JWT_claimsets[new_key]=date/1000;
	}
	if(key == 'tkau'){
	    new_key = 'aud';
    	    new_audience_list = [];
	    for (var audience of onem2m_claimsets[key]){
		new_audience = 'https:'+audience;  // or 'http://' -> usespid
		console.log(new_audience);
		new_audience_list.push(new_audience);
                console.log(new_audience_list);
	    }
	    JWT_claimsets[new_key]=new_audience_list;
	}

    }
    return JWT_claimsets;
}

function convert_JWT_token_to_onem2m(JWT_claimsets){
    var onem2m_claimsets= {};
    for (var key in JWT_claimsets){
	if(key == 'vr' || key == 'tknm' || key == 'tkps' || key == 'tkex'){
	    onem2m_claimsets[key]=JWT_claimsets[key];
	}
	if(key == 'jti'){
	    new_key = 'tkid';
	    onem2m_claimsets[new_key]=JWT_claimsets[key];
	}
	if(key == 'iss'){
 	    new_key = 'tkis';
	    onem2m_claimsets[new_key]=JWT_claimsets[key];
	}
	if(key == 'azp'){
	    new_key='tkhd';
	    onem2m_claimsets[new_key]=JWT_claimsets[key];
	}
	if(key == 'nbf'){
	    new_key='tknb';
	    // convert Unix time to m2m:timestamp
            date_str = new Date(JWT_claimsets[key]*1000);
	    d = date_str.toISOString();  // extended format string
	    d1 = d.replace(/[-:.Z]/g,'');
	    d_str = d1.substring(0,15);
	    onem2m_claimsets[new_key]=d_str;
	}
	if(key == 'exp'){
	    new_key='tkna';
	    // convert Unix time to m2m:timestamp
            date_str = new Date(JWT_claimsets[key]*1000);
	    d = date_str.toISOString();  // extended format string
	    d1 = d.replace(/[-:.Z]/g,'');
	    d_str = d1.substring(0,15);
	    onem2m_claimsets[new_key]=d_str;
	}
	if(key == 'aud'){
	    new_key = 'tkau';
	    new_audience_list = [];
	    for (var audience of JWT_claimsets[key]){
		new_audience = audience.replace('https:','');
		new_audience_list.push(new_audience);
	    }
	    onem2m_claimsets[new_key]=new_audience_list;
	}
    }
    return onem2m_claimsets;
}

//@Get token from token table using tokenids
//function get_tokens(tokenids){
//    // decide option parameter
//    var token_list = [];
//    for ( var tokenid of tokenids){
//	sql='select tkob from tokens where tkid = ' + tokenid;
//    }
//}

function sample_JWS(){
    payload = sample_JWT_claimset();
    header =  JWS_header();
    key = get_key('JWS'); // private RSA 2048 bits key
    token = encode_token('JWS',header,payload,key);
    return token;
}

function sample_JWE(){
    payload = sample_JWT_claimset();
    header =  JWE_header();
    key = get_key('JWE',undefined,undefined,false); // RSA 2048(bits) public key
    //key = get_key('JWE','OKP',256,false); // symmetric key
    token = encode_token('JWE',header,payload,key);
    return token;
}

// for JWS, use self private key to sign
// use JWE, use private key to encode
function encode_token(token_type = 'JWT', header, payload, key){
//    console.log('type of payload data =', typeof(payload));
    console.log('header = ', JSON.stringify(header));
    console.log('payload = ',JSON.stringify(payload));
    console.log('key = ', JSON.stringify(key));
    console.log('key val = ', key.k);
//    console.log('supported algo num =', key.algorithms().size);
//    console.log('supported algo =', key.algorithms());
    
    if(token_type == 'JWT'){
	token = jose.JWT.sign(payload, jose.JWK.None);
    }else if(token_type == 'JWS'){
	token = jose.JWS.sign(payload, key, header);
    }else if( token_type == 'JWE'){
	token = jose.JWE.encrypt(JSON.stringify(payload),key, header);
	console.log('encrypted token =', token);
	console.log('decrypted token =', jose.JWE.decrypt(token,key,{ complete: true }));
        tkn =  jose.JWE.decrypt(token,key,{ complete: true });
	console.log('decoded payload =',tkn['cleartext'].toString())
    }
    return token;
}

//  for JWE, use self-private key to decode
//  for JWS, use other side's public key to decode
function decode_token(token_type = 'JWT', token, key){
    
    if(token_type == 'JWT'){
	decoded_token = jose.JWT.verify(token, jose.JWK.None,{ complete: true });
    }else if(token_type == 'JWS'){
	decoded_token = jose.JWS.verify(token, key,{ complete: true });
    }else if( token_type == 'JWE'){
	decoded_token = jose.JWE.decrypt(token,key,{ complete: true });
    }
    return decoded_token;
}

function get_header(token_type = 'JWT', algorithm, encrypt){

    if (token_type == 'JWT')
	header = JWT_header();
    else if (token_type == 'JWS')
	header = JWS_header(algorithm);
    else if (token_type == 'JWE')
	header = JWE_header(algorithm, encrypt);
    else if (token_type ='Nested')
	header = Nested_header();

    console.log('header=',header);
    return header;
    
}

function JWS_header(algorithm = 'RS256'){
    header = {
	"alg": algorithm,
	"typ": "JWT"
    };
    return header;
}

//function JWE_header(algorithm = 'A256KW', encrypt = 'A256GCM'){	// header for oct
function JWE_header(algorithm = 'RSA-OAEP-256', encrypt = 'A128GCM'){	// header for RSA
    header = {
	"alg": algorithm,
	"enc": encrypt,
	"typ": "JWT"
    };
    return header;
}

function JWT_header(){
    header = {'alg':'none'};
    return header;
}

// {
//  JWS_header: { alg: 'RS256', typ: 'JWT' },
//  JWE_header: { alg: 'RSA-OAEP-256', enc: 'A128GCM', typ: 'JWT', cty: 'JWT' }
//}
//
function Nested_header(jws_alg = 'RS256', jwe_alg = 'RSA-OAEP-256', jwe_enc = 'A128GCM'){
    JWS_header = {
	"alg": jws_alg,
	"typ": "JWT"
    };
    JWE_header ={
	"alg": jwe_alg,
	"enc": jwe_enc,
	"typ": "JWT",
	"cty": "JWT"
    };
    header = {JWS_header,JWE_header}
    return header;
}

// sendback token 
function send_tokens(){
}

function send_tokens_with_roleids(filtered_roleids){
}

// Key type. Must be 'RSA', 'EC', OKP' or 'oct'.
// the key file should be pre-stored in the key file and  


// How to import key (symmetric key) from file
// 
// {
//	"k": "lxgTP1LqzZ0XFhlrA5KhBmwEkUW8W1bqXmXxqAAUCas",
//	"kty": "oct",
//	"kid": "98qkBe6QbHHQiVo6h2g40QTJNuokT97C81T9qJvcmI8"
//}
//
// const { readFileSync } = require('fs')
// x= readFileSync('C:/Users/h-kato/key_file.txt')
// x1=x.toString()
// x2=JSON.parse(x1)
// key = jose.JWK.asKey(x2)

function get_key(token_type = 'JWE', key_type = 'RSA', key_size = 256, is_private = true){
    usage = {};
    if(token_type == 'JWS'|| token_type == 'JWT'){ //sign with my private key
//	usage = 'sig';
    }
    else if( token_type == 'JWE'){ // encode with the other end's (CSE's) key
//	usage = 'enc';
	is_private = false;
    }
    // Nested case?
    console.log(token_type,key_type,key_size,is_private);
    // create private key and then get public key from it to decode
//    gen_key = jose.JWK.generateSync(key_type,key_size,{ use: usage },is_private) ;
//    gen_key = jose.JWK.generateSync(key_type,key_size,{ use: usage }) ;	// define the usage
    gen_key = jose.JWK.generateSync(key_type) ;
    if(key_type != 'oct'){
        console.log('key type =', gen_key.type);
	console.log('key operation = ', gen_key.key_ops);
	console.log('key algorithms = ',gen_key.algorithms());
	console.log('key algorithms(encrypt) = ',gen_key.algorithms('encrypt'));
	console.log('key algorithms(decrypt) = ',gen_key.algorithms('decrypt'));

    	console.log('private key = ', JSON.stringify(gen_key.toJWK(true)));
        console.log('private pem key = ', JSON.stringify(gen_key.toPEM(true)));
	console.log('public key = ', JSON.stringify(gen_key.toJWK(false)));
        console.log('public pem key = ', JSON.stringify(gen_key.toPEM(false)));
/*
        if(is_private){
            key = gen_key;
        }else{
            key = jose.JWK.asKey(gen_key.toJWK(false));
        }
*/
        key = gen_key;
    }else{
	console.log('secret key = ', JSON.stringify(gen_key.toJWK(false)));
	console.log('secret key value (k) =', gen_key.k);
	key = gen_key;
    }
    return key;
}

/*
function get_key(token_type = 'JWE', key_type = 'oct', key_size = 256, is_private = false){
    
//    x= fs.readFileSync('C:/Users/h-kato/key_file.txt')
    x= fs.readFileSync('key_file.txt')
    x1=x.toString()
    x2=JSON.parse(x1)
    return key = jose.JWK.asKey(x2)
}
*/

// > jose.JWK
//{
//  asKey: [Function: asKey],
//  generate: [AsyncFunction: generate],
//  generateSync: [Function: generateSync],
//  isKey: [Function]
//}
