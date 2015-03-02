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

function writePostToSolr(data, i, solr_client, res) {
    solrdoc = new helios.document();
    if (typeof data[i] != 'undefined') {
        console.log(data[i]);
        solrdoc.addField('id', data[i].id);
        solrdoc.addField('forum', data[i].forum);
        solrdoc.addField('forum_name', data[i].forum_name);
        solrdoc.addField('thread', data[i].thread);
        solrdoc.addField('thread_name', data[i].thread_name);
        solrdoc.addField('thread_id', data[i].thread_id);
        solrdoc.addField('post', data[i].post);
        solrdoc.addField('ip_address', data[i].ip_address);
        solrdoc.addField('author', data[i].author);
        solrdoc.addField('thread_author', data[i].thread_author);
        solrdoc.addField('last_modified', data[i].last_modified);

        solr_client.addDoc(solrdoc, true, function (err) {
            if (err) {
                console.log(err);
            } else {
                if (i == data.length) {
                    res.end(wrapResponseInCallback(req.query.callback, data));
                } else {
                    writePostToSolr(data, i + 1, solr_client, res);
                }
            }
        })
    }
    else {
        res.end()
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
};

exports.putSolr = function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    var filename = getQueryTermFromQueryString(req.query.filename);

    solr_client = new helios.client(config.forum_connection);

    fs.readFile(filename, 'utf8', function (err, data) {
        if (err) {
            console.log('Error: ' + err);
            return;
        }

        data = JSON.parse(data);
        writePostToSolr(data, 0, solr_client, res);
    });
};