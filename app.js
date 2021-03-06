const cookieParser = require('cookie-parser');
const session = require('express-session');
const createError = require('http-errors');
const flash = require('connect-flash');
const express = require('express');
const logger = require('morgan');
const { Pool } = require('pg');
const path = require('path');
const fileUpload = require('express-fileupload');
const pool = new Pool({
  user : 'postgres',
  host : 'localhost',
  database : 'pms',
  password : 'lala123',
  port : 5432
})

const helpers = require('./helpers/util.js')
console.log('Connected to the database');

const indexRouter = require('./routes/index')(pool);
const usersRouter = require('./routes/users')(pool);
const profilesRouter = require('./routes/profiles')(pool);
const projectsRouter = require('./routes/projects')(pool);

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(fileUpload());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(flash());
app.use(session({
  secret : '4d4d3hm@uT@u4Ja',
  resave : false,
  saveUninitialized : true
}));

app.use(function (req, res, next) {
  res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
  next();
});

app.use('/', indexRouter);
app.use(helpers.isLoggedIn); 
app.use('/users', usersRouter);
app.use('/profiles', profilesRouter);
app.use('/projects', projectsRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
