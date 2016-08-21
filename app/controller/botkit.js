/**
 * http://usejsdoc.org/
 */
var Botkit                = require('botkit');
var http = require('http');
var https = require('https');
var request = require('request');
//var mongoUri              = process.env.MONGODB_URI || 'mongodb://localhost/demo'
//var db                    = require('../../config/db')({mongoUri: mongoUri})

var controller = Botkit.facebookbot({
  debug: false,
  access_token: process.env.page_token,
  verify_token: process.env.verify_token
//  storage: db
})

var bot = controller.spawn({})


//subscribe to page events
request.post('https://graph.facebook.com/me/subscribed_apps?access_token=' + process.env.page_token,
  function(err, res, body) {
    if (err) {
        controller.log('Could not subscribe to page messages');
    }
    else {
      controller.log('Successfully subscribed to Facebook events:', body);
      console.log('Botkit activated')

      //start ticking to send conversation messages
      controller.startTicking()
    }
})

console.log('botkit')

// this is triggered when a user clicks the send-to-messenger plugin
controller.on('facebook_optin', function(bot, message) {
    bot.reply(message, 'Welcome, friend');
})

controller.hears(['hello', 'hi'], 'message_received', function(bot, message) {
    controller.storage.users.get(message.user, function(err, user) {
        if (user && user.name) {
            bot.reply(message, 'Hello ' + user.name + '!!');
        } else {
            bot.reply(message, 'Hello.');
        }
    });
});


controller.hears(['structured'], 'message_received', function(bot, message) {

    bot.startConversation(message, function(err, convo) {
        convo.ask({
            attachment: {
                'type': 'template',
                'payload': {
                    'template_type': 'generic',
                    'elements': [
                        {
                            'title': 'Classic White T-Shirt',
                            'image_url': 'http://petersapparel.parseapp.com/img/item100-thumb.png',
                            'subtitle': 'Soft white cotton t-shirt is back in style',
                            'buttons': [
                                {
                                    'type': 'web_url',
                                    'url': 'https://petersapparel.parseapp.com/view_item?item_id=100',
                                    'title': 'View Item'
                                },
                                {
                                    'type': 'web_url',
                                    'url': 'https://petersapparel.parseapp.com/buy_item?item_id=100',
                                    'title': 'Buy Item'
                                },
                                {
                                    'type': 'postback',
                                    'title': 'Bookmark Item',
                                    'payload': 'White T-Shirt'
                                }
                            ]
                        },
                        {
                            'title': 'Classic Grey T-Shirt',
                            'image_url': 'http://petersapparel.parseapp.com/img/item101-thumb.png',
                            'subtitle': 'Soft gray cotton t-shirt is back in style',
                            'buttons': [
                                {
                                    'type': 'web_url',
                                    'url': 'https://petersapparel.parseapp.com/view_item?item_id=101',
                                    'title': 'View Item'
                                },
                                {
                                    'type': 'web_url',
                                    'url': 'https://petersapparel.parseapp.com/buy_item?item_id=101',
                                    'title': 'Buy Item'
                                },
                                {
                                    'type': 'postback',
                                    'title': 'Bookmark Item',
                                    'payload': 'Grey T-Shirt'
                                }
                            ]
                        }
                    ]
                }
            }
        }, function(response, convo) {
            // whoa, I got the postback payload as a response to my convo.ask!
            convo.next();
        });
    });
});

controller.on('facebook_postback', function(bot, message) {

    bot.reply(message, 'Great Choice!!!! (' + message.payload + ')');

});


controller.hears(['call me (.*)', 'my name is (.*)'], 'message_received', function(bot, message) {
    var name = message.match[1];
    controller.storage.users.get(message.user, function(err, user) {
        if (!user) {
            user = {
                id: message.user,
            };
        }
        user.name = name;
        controller.storage.users.save(user, function(err, id) {
            bot.reply(message, 'Got it. I will call you ' + user.name + ' from now on.');
        });
    });
});

controller.hears(['what is my name', 'who am i'], 'message_received', function(bot, message) {
    controller.storage.users.get(message.user, function(err, user) {
        if (user && user.name) {
            bot.reply(message, 'Your name is ' + user.name);
        } else {
            bot.startConversation(message, function(err, convo) {
                if (!err) {
                    convo.say('I do not know your name yet!');
                    convo.ask('What should I call you?', function(response, convo) {
                        convo.ask('You want me to call you `' + response.text + '`?', [
                            {
                                pattern: 'yes',
                                callback: function(response, convo) {
                                    // since no further messages are queued after this,
                                    // the conversation will end naturally with status == 'completed'
                                    convo.next();
                                }
                            },
                            {
                                pattern: 'no',
                                callback: function(response, convo) {
                                    // stop the conversation. this will cause it to end with status == 'stopped'
                                    convo.stop();
                                }
                            },
                            {
                                default: true,
                                callback: function(response, convo) {
                                    convo.repeat();
                                    convo.next();
                                }
                            }
                        ]);

                        convo.next();

                    }, {'key': 'nickname'}); // store the results in a field called nickname

                    convo.on('end', function(convo) {
                        if (convo.status == 'completed') {
                            bot.reply(message, 'OK! I will update my dossier...');

                            controller.storage.users.get(message.user, function(err, user) {
                                if (!user) {
                                    user = {
                                        id: message.user,
                                    };
                                }
                                user.name = convo.extractResponse('nickname');
                                controller.storage.users.save(user, function(err, id) {
                                    bot.reply(message, 'Got it. I will call you ' + user.name + ' from now on.');
                                });
                            });



                        } else {
                            // this happens if the conversation ended prematurely for some reason
                            bot.reply(message, 'OK, nevermind!');
                        }
                    });
                }
            });
        }
    });
});

controller.hears(['testvalues'], 'message_received', function(bot, message) {

    bot.startConversation(message, function(err, convo) {

        convo.ask('Please provide 7 digit policy number', [
            {
                pattern: /^\d{7}$/,
                callback: function(response, convo) {
                	var optionsget = {
                		    host : 'valuation-nodeaholic.rhcloud.com', // here only the domain name
                		    // (no http/https !)
                		    //port : 8080,
                		    path : '/polvalue?policy=' + response.text, // the rest of the url with parameters if needed
                		    method : 'GET' // do GET
                		};

                		console.info('Options prepared:');
                		console.info(optionsget);
                		console.info('Do the GET call');
                		//var PolValue;
                		// do the GET request
                		var reqGet = http.request(optionsget, function(res) {
                		    console.log("statusCode: ", res.statusCode);
                		    // uncomment it for header details
                		//  console.log("headers: ", res.headers);


                		    res.on('data', function(d) {
                		        console.info('GET result:\n');
                		        process.stdout.write(d);
                		        console.info('\n\nCall completed');
                		        var PolValue = JSON.parse(d);
                		        convo.say('valuation is: ' + PolValue.valuation);
                		        convo.next();
                		    });
                		   //var PolValue = JSON.parse(res);
                		   //var PolValue = d;
                		   //convo.say('valuation is: ' + PolValue.valuation);
                		   //convo.next();

                		});

                		reqGet.end();
                		reqGet.on('error', function(e) {
                		    console.error(e);
                		    convo.next();
                		});
                	//var PolValue = res;
                	//convo.say('valuation is: ' + PolValue.valuation);
                    //convo.next();
                    
                }
            },
        {
            default: true,
            callback: function(response, convo) {
               convo.say('invalid policy number');
           //     convo.next();
               convo.repeat();
               convo.next();
            }
        }
        ]);
    });
});

controller.hears(['policy values'], 'message_received', function(bot, message) {
	var policies;
	var optionsget = {
		    host : 'valuation-nodeaholic.rhcloud.com', // here only the domain name
		    path : '/policyvalue?first_name=Soumyajita&last_name=Banerjeea', // the rest of the url with parameters if needed
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
		        res.on('data', function(d) {
		        console.info('GET result:\n');
		        process.stdout.write(d);
		        console.info('\n\nCall completed');
//		        convo.say("You have following policies - select the number or all")
		        policies = JSON.parse(d);
		        bot.startConversation(message, function(err, convo) {
		        	
		        	convo.say("You have following policies:");
		            policies.forEach(function(element,index){
		            	console.log(element, index);
		            	convo.say(index + '.' + element.policy);
		            	});
		         
		        
		            convo.ask('select the number or all', [
		                {
		                    pattern: /^\d{1}$/,
		                    callback: function(response, convo) {
		                    	var listitem = response.text;
		                    	convo.say (policies[listitem].policy + ":" + "£" + policies[listitem].valuation);
		                    	convo.next();
		                    	//var PolValue = res;
		                    	//convo.say('valuation is: ' + PolValue.valuation);
		                        //convo.next();
		                        
		                    }
		                },
		            {
		                default: true,
		                callback: function(response, convo) {
		                   convo.say('invalid selection');
		               //     convo.next();
		                   convo.repeat();
		                   convo.next();
		                }
		            }
		            ]);
		        });
		      });
//		        convo.say('valuation is: ' + PolValue.valuation);
//		        convo.next();
    		});

    		reqGet.end();
    		reqGet.on('error', function(e) {
    		    console.error(e);
    //		    convo.next();
    		    bot.reply("error getting policies");
    		});

});

controller.hears(['valuation'], 'message_received', function(bot, message) {
	var optionsget = {
		    host : 'graph.facebook.com', // here only the domain name
		    path : '/v2.6/' + message.user + '?fields=first_name,last_name,profile_pic,locale,timezone,gender&access_token=' + process.env.page_token, // the rest of the url with parameters if needed
		    port : 443,
		    method : 'GET' // do GET
		};
	console.info('Options prepared:');
	console.info(optionsget);
	console.info('Do the GET call');
	//var PolValue;
	// do the GET request
	var reqGet = https.request(optionsget, function(res) {
	    console.log("statusCode: ", res.statusCode);
	    // uncomment it for header details
	//  console.log("headers: ", res.headers);


	    res.on('data', function(d) {
	        console.info('GET result:\n');
	        process.stdout.write(d);
	        console.info('\n\nCall completed');
	        var userinfo = JSON.parse(d);
	    	var policies;
	    	var optionsget = {
	    		    host : 'valuation-nodeaholic.rhcloud.com', // here only the domain name
	    		    path : '/policyvalue?first_name=' + userinfo.first_name + '&last_name=' + userinfo.last_name, // the rest of the url with parameters if needed
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
	    		        res.on('data', function(d) {
	    		        console.info('GET result:\n');
	    		        process.stdout.write(d);
	    		        console.info('\n\nCall completed');
//	    		        convo.say("You have following policies - select the number or all")
	    		        policies = JSON.parse(d);
	    		        bot.startConversation(message, function(err, convo) {
	    		        	
	    		        	convo.say("You have following policies:");
	    		            policies.forEach(function(element,index){
	    		            	console.log(element, index);
	    		            	convo.say( '  ' + (index + 1) + '.' + element.policy);
	    		            	});
	    		         
	    		        
	    		            convo.ask('select the number or all', [
	    		                {
	    		                    pattern: /^\d{1}$/,
	    		                    callback: function(response, convo) {
	    		                    	var listitem = response.text - 1;
	    		                    	convo.say (policies[listitem].policy + ":" + " £" + policies[listitem].valuation);
	    		                    	convo.next();
	    		                    	//var PolValue = res;
	    		                    	//convo.say('valuation is: ' + PolValue.valuation);
	    		                        //convo.next();
	    		                        
	    		                    }
	    		                },
	    		            {
	    		                default: true,
	    		                callback: function(response, convo) {
	    		                   convo.say('invalid selection');
	    		               //     convo.next();
	    		                   convo.repeat();
	    		                   convo.next();
	    		                }
	    		            }
	    		            ]);
	    		        });
	    		      });
//	    		        convo.say('valuation is: ' + PolValue.valuation);
//	    		        convo.next();
	        		});

	        		reqGet.end();
	        		reqGet.on('error', function(e) {
	        		    console.error(e);
	        //		    convo.next();
	        		    bot.reply("error getting policies");
	        		});
	    });
	});

	reqGet.end();
	reqGet.on('error', function(e) {
	    console.error(e);
	    bot.reply("error getting userinfo");
	});
});

controller.hears(['shutdown'], 'message_received', function(bot, message) {

    bot.startConversation(message, function(err, convo) {

        convo.ask('Are you sure you want me to shutdown?', [
            {
                pattern: bot.utterances.yes,
                callback: function(response, convo) {
                    convo.say('Bye!');
                    convo.next();
                    setTimeout(function() {
                        process.exit();
                    }, 3000);
                }
            },
        {
            pattern: bot.utterances.no,
            default: true,
            callback: function(response, convo) {
                convo.say('*Phew!*');
                convo.next();
            }
        }
        ]);
    });
});


controller.hears(['uptime', 'identify yourself', 'who are you', 'what is your name'], 'message_received',
    function(bot, message) {

    //    var hostname = os.hostname();
	    var hostname = process.env.OPENSHIFT_BROKER_HOST;
        var uptime = formatUptime(process.uptime());

        bot.reply(message,
            ':|] I am a bot. I have been running for ' + uptime + ' on ' + hostname + '.');
    });



controller.on('message_received', function(bot, message) {
    bot.reply(message, 'Try: `what is my name` or `who are you` or `valuation` or `call me captain`');
    return false;
});


function formatUptime(uptime) {
    var unit = 'second';
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'minute';
    }
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'hour';
    }
    if (uptime != 1) {
        unit = unit + 's';
    }

    uptime = uptime + ' ' + unit;
    return uptime;
}




//this function processes the POST request to the webhook
var handler = function(obj){
  controller.debug('GOT A MESSAGE HOOK');
  if (obj.entry) {
    for (var e = 0; e < obj.entry.length; e++) {
      for (var m = 0; m < obj.entry[e].messaging.length; m++) {
        var facebook_message = obj.entry[e].messaging[m];

        console.log(facebook_message)

        //normal message
        if (facebook_message.message) {

          var message = {
              text: facebook_message.message.text,
              user: facebook_message.sender.id,
              channel: facebook_message.sender.id,
              timestamp: facebook_message.timestamp,
              seq: facebook_message.message.seq,
              mid: facebook_message.message.mid,
              attachments: facebook_message.message.attachments,
          }

          //save if user comes from m.me adress or Facebook search
          //create_user_if_new(facebook_message.sender.id, facebook_message.timestamp)

          controller.receiveMessage(bot, message);
        }
        //clicks on a postback action in an attachment
        else if (facebook_message.postback) {

          // trigger BOTH a facebook_postback event
          // and a normal message received event.
          // this allows developers to receive postbacks as part of a conversation.
          var message = {
              payload: facebook_message.postback.payload,
              user: facebook_message.sender.id,
              channel: facebook_message.sender.id,
              timestamp: facebook_message.timestamp,
          };

          controller.trigger('facebook_postback', [bot, message]);

          var message = {
              text: facebook_message.postback.payload,
              user: facebook_message.sender.id,
              channel: facebook_message.sender.id,
              timestamp: facebook_message.timestamp,
          };

          controller.receiveMessage(bot, message);

        }
        //When a user clicks on "Send to Messenger"
    /*    else if (facebook_message.optin) {

          var message = {
              optin: facebook_message.optin,
              user: facebook_message.sender.id,
              channel: facebook_message.sender.id,
              timestamp: facebook_message.timestamp,
          };

          //save if user comes from "Send to Messenger"
          create_user_if_new(facebook_message.sender.id, facebook_message.timestamp)

          controller.trigger('facebook_optin', [bot, message]);
        } */
        //message delivered callback
        else if (facebook_message.delivery) {

          var message = {
              optin: facebook_message.delivery,
              user: facebook_message.sender.id,
              channel: facebook_message.sender.id,
              timestamp: facebook_message.timestamp,
          };

          controller.trigger('message_delivered', [bot, message]);

        }
        else {
          controller.log('Got an unexpected message from Facebook: ', facebook_message);
        }
      }
    }
  }
}

/*var create_user_if_new = function(id, ts){
  controller.storage.users.get(id, function(err, user){
    if(err){
      console.log(err)
    }
    else if(!user){
      controller.storage.users.save({id: id, created_at: ts})
    }
  })
} */

exports.handler = handler