const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');

router.use(bodyParser.urlencoded({extended: false}));
router.use(bodyParser.json());

module.exports = (pool) => {
  router.get('/',  (req, res, next) => {
    res.render('users/dashboard');
  });

  router.get('/edit/:id', (req, res, next) => {
    const id = [req.params.id];
    let getUserData = 'SELECT email, password, firstname, lastname, isfulltime, position WHERE userid=$1'
    pool.query(getUserData, [id], (err, result) => {
      if(err) res.render('error', err);
      res.render('users')
    })
  })

  router.post('/edit/:id', (req, res, next) => {
    let queryUpdate = 'UPDATE SET email = $1, password = $2, firstname = $3, lastname = $4, isfulltime = $5, position = $6 WHERE userid = $7';
    let body = [req.body.email, req.body.firstname, req.body.lastname, req.body.isfulltime, req.body.position, req.params.id];
    pool.query(queryUpdate, body, (err) => {
      if (err) res.render ('error', err);
      res.redirect(`edit/${req.params.id}`);
    })
  })

  router.post('/add', (req, res, next) => { 
    let insertQuery = 'INSERT INTO users(email, password, firstname, lastname, isfulltime, position) VALUES($1, $2, $3, $4, $5, $6)';
    let body = [req.body.email, req.body.password, req.body.firstname, req.body.lastname, req.body.isfulltime, req.body.position];
    pool.query(insertQuery, body, (err) => {
      if(err) console.error(err);
      res.json({...body});
    });
  });

  router.get('/delete/:id', (req, res, next) => {
    let deleteQuery = 'DELETE FROM users WHERE userid = $1';
    let id = [req.params.id];
    pool.query(deleteQuery, id, (err, result) => {
      res.json({id})
    })
  })
  return router;
}