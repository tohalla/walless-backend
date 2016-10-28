// @flow
import postgraphql from 'postgraphql';
import express from 'express';
import bodyParser from 'body-parser';

import dbConfig from './db';
import translation from './translation';
import auth from './auth';

const app = express();
app
  .use(
    postgraphql(
      dbConfig.pg,
      'public',
      {
        enableCors: true, // should put api behind reverse proxy
        development: process.env.NODE_ENV === 'development',
        graphiql: process.env.NODE_ENV === 'development',
        jwtSecret: process.env.JWT_SECRET,
        anonymousRole: 'postgres',
        watchPg: process.env.NODE_ENV === 'development',
        jwtPgTypeIdentifies: 'auth.jwt_claim'
      }
    )
  )
  .use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Request-Method', 'GET');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept'
    );
    res.header('Content-Type', 'application/json; charset=utf-8');
    return next();
  })
  .use('/translation', translation)
  .use(bodyParser.json())
  .use('/auth', auth)
  .listen(8080);
