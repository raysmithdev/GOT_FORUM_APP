'use strict';

const data = require('./seed-data');
const bodyParser = require('body-parser');

const passport = require('passport');
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const {User, Post} = require('./models');
const {DATABASE_URL, PORT} = require('./config');
const {router: userRouter,  localStrategy } = require('./auth');
const JwtStrategy = require('./auth').Strategy;

app.use(express.static('public'));
app.use(bodyParser.json());

//****auth */
// CORS
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE');
  if (req.method === 'OPTIONS') {
    return res.send(204);
  }
  next();
});

passport.use(localStrategy);
passport.use(jwtStrategy);

app.use('/api/users/', userRouter);
// app.use('/api/auth/', authRouter);

const jwtAuth = passport.authenticate('jwt', { session: false });

// A protected endpoint which needs a valid JWT to access it
app.get('/api/protected', jwtAuth, (req, res) => {
  return res.json({
    data: 'rosebud'
  });
});
//******auth */


app.get('/posts', function(req, res){
  Post
    .find()
    .then(posts => {res.json(posts.map(post => post.apiRepr()));})
    .catch (err => {
      console.error(err);
      res.status(500).json({error: 'something went wrong'});
    });
  // res.json(data);
});

app.get('/posts/:id', function(req, res){
  Post.findById(req.params.id)
    .then(post => res.json(post.apiRepr()))
    .catch(err => {
      console.error(err);
      res.status(500).json({error: 'something went wrong'});
    });
  // console.log(req.params.id);
  // res.json(data[0]);
});

app.post('/posts', function(req, res){
  const requiredFields = ['author', 'title', 'content'];
  for (let i=0; i < requiredFields.length; i++) {
    const field = requiredFields[i];
    if (!(field in req.body)) {
      const message = `Missing \`${field}\` in request body`;
      console.error(message);
      return res.status(400).send(message);
    }
  }

  Post
    .create({
      title: req.body.title,
      content: req.body.content,
      author: req.body.author
    })
    .then(forumPost =>{
      console.log(forumPost);
      res.status(201).json(forumPost.apiRepr());
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({error: 'something went wrong'});
    });
});

app.delete('/posts/:id', (req, res) => {
  Post
    .findByIdAndRemove(req.params.id)
    .then(() => {
      res.status(204).json({message: 'success'});
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({error: 'something went terribly wrong'});
    });
});

app.put('/posts/:id', function(req, res){
  if(!(req.params.id && req.body.id === req.body.id)){
    res.status(400).json({
      error: 'Request path ID and request body ID must match'
    });
  }
  const updated = {};
  const updatableFields = ['title', 'content'];
  updatableFields.forEach(field => {
    if(field in req.body){
      updated[field] = req.body[field];
    }
  });
  Post
    .findByIdAndUpdate(req.params.id, {$set: updated}, {new: true})
    .then(updatedPost => {
      res.status(204).end();
    })
    .catch(err => {
      res.status(500).json({message: 'Something went wrong'});
    });
});

app.post('/posts/:id/comments', function(req, res){

  Post
    .findOne({'_id':req.params.id}, function(err, post){
      console.log(post);
      post.comments.push({
        author: 'bob',
        content: 'this is some content'
      });
    });
  // const requiredFields = ['author','content'];
  // for(let i=0; i<requiredFields.length; i++){
  //   const field = requiredFields[i];
  //   if(!(field in req.body)){
  //     const message = `Missing ${field} in request body`;
  //     console.error(message);
  //     return res.status(400).send(message);
  //   }
  // }
  // Post
  //   .findByIdAndUpdate(req.params.id, {'$push': 
  //     {'comments.$.DataSource': {
  //       'author': req.body.author,
  //       'content': req.body.content,
  //     }}
  //   }, {new: true})
  //   .then(newComment =>{
  //     console.log(newComment);
  //     res.status(204).end();
  //   })
  //   .catch(err => {
  //     console.error(err);
  //     res.status(500).json({error: 'something went wrong'});
  //   });
});

app.use('/api/auth', userRouter);

app.use('*', function(req, res) {
  res.status(404).json({message: 'Not Found'});
});

let server;

function runServer() {
  const port = process.env.PORT || 8080;
  return new Promise((resolve, reject) => {
    server = app.listen(port, () => {
      mongoose.connect(DATABASE_URL, {useMongoClient: true});
      console.log(`Your app is listening on port ${port}`);
      resolve(server);
    }).on('error', err => {
      reject(err);
    });
  });
}
  
function closeServer() {
  return new Promise((resolve, reject) => {
    console.log('Closing server');
    server.close(err => {
      if (err) {
        reject(err);
        // so we don't also call `resolve()`
        return;
      }
      resolve();
    });
  });
}

if (require.main === module) {
  runServer().catch(err => console.error(err));
}
  
module.exports = {app, runServer, closeServer};