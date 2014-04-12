var config = require('../libs/config.js');
var helios = require('helios');
var moment = require('moment');
var fs = require('fs');

////////////////////////////////////////////////////////
// Input cleansing functions
////////////////////////////////////////////////////////
function wrapResponseInCallback(callbackQuerystring, responseText) {
  return getCallbackOpenFromQueryString(callbackQuerystring)
    + responseText
    + getCallbackCloseFromQueryString(callbackQuerystring);
}

function getCallbackOpenFromQueryString(url_callback) {
  var retStr = '';
  if (url_callback) retStr = url_callback + '(';
  return retStr;
}

function getCallbackCloseFromQueryString(url_callback) {
  var retStr = '';
  if (url_callback) retStr = ')';
  return retStr;
}

function getQueryTermFromQueryString(url_queryterm) {
  if (url_queryterm) return url_queryterm;
  return '';
}

////////////////////////////////////////////////////////
// SOLR response transform functions
////////////////////////////////////////////////////////
function solrResponseToPostList(res) {
  var postList = res.response.docs;
  for (var i = 0; i < postList.length; i++) {
    if (postList[i].post) {
      postList[i].post = postList[i].post.replace(/\n/g, '<br>');
    }
  }
  return postList;
}

function stringifyPosts(key, value) {
  switch(key) {
    case '_version_': return undefined; break;
    default: return value; break;
  }
}


////////////////////////////////////////////////////////
// exports
////////////////////////////////////////////////////////
exports.getSolr = function(req, res) {
  res.setHeader('Content-Type', 'application/json');
  var start = getQueryTermFromQueryString(req.query.start);
  var end = getQueryTermFromQueryString(req.query.end);
  var pageSize = getQueryTermFromQueryString(req.query.pageSize);
  var filename = getQueryTermFromQueryString(req.query.filename);

  solr_start_date = moment(start).toISOString();
  solr_end_date = moment(end).toISOString();
  solr_client = new helios.client(config.forum_connection);

  fq = '+last_modified:[' + solr_start_date + ' TO ' + solr_end_date + ']';

  if (!pageSize) pageSize = 1000000;

  solr_client.select({
    fq: fq,
    sort: 'last_modified desc',
    wt: 'json',
    rows: pageSize,
    q: '*:*'
  }, function (err, solr_res) {
    if (err) throw err;
    var postList = solrResponseToPostList(JSON.parse(solr_res));
    if (!filename) {
      res.end(wrapResponseInCallback(req.query.callback, JSON.stringify(postList, stringifyPosts, 2)));
    } else {
      fs.writeFile(filename, JSON.stringify(postList, stringifyPosts, 2), function (err) {
        var status_message = "saved as " + filename;
        if (err) {
          status_message = "error = " + err.message;
        }
        status = {
          "description": status_message
        }
        res.end(wrapResponseInCallback(req.query.callback, JSON.stringify(status, stringifyPosts,2)));
      });
    }

  });


}