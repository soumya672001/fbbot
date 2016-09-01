/**
 * http://usejsdoc.org/
 */
var facebook_handler = require('../controller/botkit').handler

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
  
}