// @flow
import postgraphql from 'postgraphql';
import express from 'express';

import dbConfig from './db';
import translation from './translation';

const app = express();

app
  .use('/graphql',
    postgraphql(
      dbConfig.pg,
      'public',
      {
        development: process.env.NODE_ENV === 'development',
        secret: process.env.tokenSecret,
        anonymousRole: 'guest'
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
    return next();
  })
  .use('/translation', translation)
  .listen(8080);
