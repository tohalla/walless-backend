// @flow
import postgraphql from 'postgraphql';
import express from 'express';

import dbConfig from './db';
import translation from './translation';

const app = express();

app
  .use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept'
    );
    return next();
  })
  .use('/graphql',
    postgraphql(
      dbConfig.pg,
      {
        development: process.env.NODE_ENV === 'development'
      }
    )
  )
  .use('/translation', translation)
  .listen(8080);
