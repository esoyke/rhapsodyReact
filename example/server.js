var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
var querystring = require('querystring');

var apiKey = 'YmVhOTBiYjAtYjEzZC00ZjdkLWJmNTktM2M0MWJlOTFkNDU2';
var apiSecret = 'NDYxOTg0ODQtZDI2Yi00MzM0LTk4YWYtNTUwZjJhYzIyNWUy';

var localPort = 2000;
var localUrl = 'http://localhost:' + localPort;
var herokuUrl = 'https://rhapsody.heroku.com'
//var redirectUri = baseUrl + '/authorize';

function baseUrl(){
  if(process.env.PORT)
    return herokuUrl+':'+process.env.PORT;
  return localUrl;
}
function redirectUri(){
  if(process.env.PORT)
    return herokuUrl+':'+process.env.PORT+'/authorize';
  return localUrl+'/authorize';
}

var app = express();

app.use(express.static(__dirname + '/'));
app.use(express.static(__dirname + '/../'));
app.use(bodyParser.json());

app.get('/', function(request, response) {
  var path = 'https://api.rhapsody.com/oauth/authorize?' + querystring.stringify({
    response_type: 'code',
    client_id: apiKey,
    redirect_uri: redirectUri()
  });
  console.log('authorize:');
  console.log(redirectUri());
  response.redirect(path);
});

app.get('/authorize', function(clientRequest, clientResponse) {
  request.post({
    url: 'https://api.rhapsody.com/oauth/access_token',
    form: {
      client_id: apiKey,
      client_secret: apiSecret,
      response_type: 'code',
      code: clientRequest.query.code,
      redirect_uri: redirectUri(),
      grant_type: 'authorization_code'
    }
  }, function(error, response, body) {
    body = JSON.parse(body);
    clientResponse.redirect(baseUrl() + '/client.html?' + querystring.stringify({
      accessToken: body.access_token,
      refreshToken: body.refresh_token
    }));
  });
});

app.get('/reauthorize', function(clientRequest, clientResponse) {
  var refreshToken = request.query.refreshToken;

  if (!refreshToken) {
    clientResponse.json(400, { error: 'A refresh token is required.'});
    return;
  }

  request.post({
    url: 'https://api.rhapsody.com/oauth/access_token',
    form: {
      client_id: apiKey,
      client_secret: apiSecret,
      response_type: 'code',
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    }
  }, function(error, response, body) {
    console.log('Platform response:', {
      error: error,
      statusCode: response.statusCode,
      body: body
    });

    if (response.statusCode !== 200) {
      clientResponse.json(response.statusCode, { error: error || body });
      return;
    }

    clientResponse.json(200, JSON.parse(body));
  });
});

app.listen(process.env.PORT || localPort, function() {
  console.log('Listening on', process.env.PORT || localPort);
});
