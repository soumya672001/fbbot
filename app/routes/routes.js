/**
 * http://usejsdoc.org/
 */
var facebook_handler = require('../controller/botkit').handler
var http = require('http');
var http = require('https');

module.exports = function(app) {
  //public pages=============================================
  //root
//  app.get('/', function(req, res) {
//    res.render('home')
//  })

  app.get('/webhook', function(req, res) {
    //This enables subscription to the webhooks
    if(req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === process.env.verify_token){
      res.send(req.query['hub.challenge'])
    }
    else{
      res.send("Incorrect verify token")
    }
  })

  app.post('/webhook', function (req, res) {

    facebook_handler(req.body)

    res.send('ok')
  })
  
  app.get('/authorize', function(req, res) {
	  var accountLinkingToken = req.query['account_linking_token'];
	  var redirectURI = req.query['redirect_uri'];

	  // Authorization Code should be generated per user by the developer. This will 
	  // be passed to the Account Linking callback.
	  var authCode = "1234567890";

	  // Redirect users to this URI on successful login
	  var redirectURISuccess = redirectURI + "&authorization_code=" + authCode;

	  res.render('authorize', {
	    accountLinkingToken: accountLinkingToken,
	    redirectURI: redirectURI,
	    redirectURISuccess: redirectURISuccess
	  });
	});
  
  app.get('/login', function (req, res) {
	    // log user out
	    //delete req.session.token;

	    // move success message into local variable so it only appears once (single read)
	  console.log("redirect uri", req.query['redirect_uri']);  
	  var viewData = { success: 1 };
	    //delete req.session.success;

	    res.render('login', viewData);
	});

  app.post('/login', function (req, res) {
	  var accountLinkingToken = req.query['account_linking_token'];
	  var redirectURI = req.query['redirect_uri'];
	  console.log("redirect uri", req.query['redirect_uri']);
	  var optionsget = {
		    host : 'valuation-nodeaholic.rhcloud.com', // here only the domain name
		    path : '/authenticate?username=' + req.body.username + '&password=' + req.body.password, // the rest of the url with parameters if needed
		    method : 'GET' // do GET
		};
	
		console.info('Options prepared:');
		console.info(optionsget);
		console.info('Do the GET call');
		
		// do the GET request
		var reqGet = http.request(optionsget, function(res) {
		    console.log("statusCode: ", res.statusCode);
		    // uncomment it for header details
		//  console.log("headers: ", res.headers);
		    var data = '';
		        res.on('data', function(d) {
                 data += d;
		        });
		        res.on('end', function(){
		        	if (data != ''){
		        		var custauth = JSON.parse(data);
		        		var optionsget = {
		        		    host : 'graph.facebook.com', // here only the domain name
		        		    path : '/v2.6/me?access_token=' + process.env.page_token + '&fields=recipient&account_linking_token=' + accountLinkingToken, // the rest of the url with parameters if needed
		        		    method : 'GET' // do GET
		        		};
		        		var reqGet = https.request(optionsget, function(res) {
		        		    console.log("statusCode: ", res.statusCode);
		        		    // uncomment it for header details
		        		//  console.log("headers: ", res.headers);
		        		    var data = '';
		        		    res.on('data', function(d) {
		        		    	data += d;
		        		    });
		        		    res.on('end', function(){
		        		    	var page_scoped_id = JSON.parse(data);
		        		  	    var optionsget = {
		        		  		    host : 'valuation-nodeaholic.rhcloud.com', // here only the domain name
		        		  		    path : '/session?psid=' + page_scoped_id.recipient + '&custid=' + custauth.custid, // the rest of the url with parameters if needed
		        		  		    method : 'GET' // do GET
		        		  		};
				        		var reqGet = http.request(optionsget, function(res) {
				        		    console.log("statusCode: ", res.statusCode);});
		        		    })
		        		});
		        		
		        		res.writeHead(301,
		        				  {Location: redirectURI + '&authorization_code=' + custauth.authorization_code}
		        				);
		        		res.end();
	
		        	}
		        	else if (res.statusCode = 404 ){
		        		res.writeHead(301,
		        				  {Location: redirectURI }
		        				);
		        		res.end();
		        	}
		        })
    		});
		reqGet.end();
	  
	});
  
}