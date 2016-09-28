// @flow
import postgraphql from 'postgraphql';
import express from 'express';

import dbConfig from './db';
import translation from './translation';

const app = express();

app
  .use('/',
    postgraphql(
      dbConfig.pg,
      {
        development: process.env.NODE_ENV === 'development'
      }
    )
  )
  .use('/translation', translation)
  .listen(8080);
