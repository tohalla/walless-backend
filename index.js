// @flow
import http from 'http';
import postgraphql from 'postgraphql';

import dbConfig from './db';

http
  .createServer(postgraphql(
    dbConfig.pg,
    {
      development: process.env.NODE_ENV === 'development'
    }
  ))
  .listen(3000);
