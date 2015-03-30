var express = require('express')
  , http = require('http')
  , extract = require('./libs/extract')
  , path = require('path');

var app = express();

// all environments
app.set('port', process.env.PORT || 7351);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

//Contact API routes
app.get('/v1/extract', extract.getSolr);
app.get('/v1/restore', extract.putSolr);

app.get('/v1/users/extract', extract.getUserSolr);
app.get('/v1/users/restore', extract.putUserSolr);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});