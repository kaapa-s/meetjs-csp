const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const Handlebars = require('handlebars');
const sha1 = require('sha1');
const sqlite3 = require('sqlite3').verbose();






const csp = require('content-security-policy');

const cspPolicy = {
    'script-src' : [ csp.SRC_SELF ],
    'default-src' : csp.SRC_SELF,
    'style-src': [ csp.SRC_SELF, csp.SRC_USAFE_INLINE, 'https://fonts.googleapis.com'],
    'font-src': [ csp.SRC_SELF, 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
};

const localCSP = csp.getCSP(cspPolicy);

const app = express();
//app.use(localCSP);








const dbFile = 'csp.db';
const exists = fs.existsSync(dbFile);
const db = new sqlite3.Database(dbFile);

const loginToken = sha1('kacper_sokolowski');

const commentView = function (req, res) {
    db.all("SELECT rowid AS id, comment FROM comments", function(err, rows) {
        fs.readFile(path.join(__dirname, '/post.html'), 'utf8', function (err, data) {
            if(!err) {
                const template = Handlebars.compile(data);
                res.send(template({comments: rows}));
            }
        });
    });
}

db.serialize(function () {
    if(!exists) {
        db.run('CREATE TABLE comments (comment TEXT)');
    }
});

app.use(express.static(__dirname));
app.use(cookieSession({
    name: 'session',
    keys: ['secret'],
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: false
}));
app.use(bodyParser.urlencoded({
    extended: true
}));

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, '/index.html'));
});

app.get('/post', commentView);

app.post('/post', function (req, res) {
    const query = db.prepare("INSERT INTO comments VALUES (?)");
    query.run(req.body.comment);
    query.finalize(function () {
        res.redirect('/post');
    });
});

app.get('/admin', function (req, res) {
    console.log(req.session, loginToken);
    if(req.session.loginToken === loginToken) {
        res.sendFile(path.join(__dirname, '/admin.html'));
    }
    else {
        res.sendFile(path.join(__dirname, '/login.html'));
    }
});


app.post('/admin', function (req, res) {
    const login = req.body.login;
    const pass = req.body.pass;

    req.session.loginToken = sha1(`${login}_${pass}`);

    res.redirect('/admin');
});

app.listen(8000, function () {
    console.log('App started');
});