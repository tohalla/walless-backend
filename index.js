// @flow
import postgraphql from 'postgraphql';
import Koa from 'koa';
import BodyParser from 'koa-better-body';
import Router from 'koa-router';
import AWS from 'aws-sdk';

import dbConfig from './db';
import translation from './translation';
import auth from './auth';
import upload from './upload';

const router = new Router()
  .use(auth.routes(), auth.allowedMethods())
  .use(translation.routes(), translation.allowedMethods())
  .use(upload.routes(), upload.allowedMethods());

AWS.config.loadFromPath('./config/awsConfig.json');

const app = new Koa();
app.context.s3 = new AWS.S3();

app
  .use(postgraphql(
    dbConfig.pg,
    'public',
    {
      enableCors: true, // should put api behind reverse proxy
      development: process.env.NODE_ENV === 'development',
      graphiql: process.env.NODE_ENV === 'development',
      jwtSecret: process.env.JWT_SECRET,
      pgDefaultRole: 'guest',
      watchPg: process.env.NODE_ENV === 'development',
      jwtPgTypeIdentifies: 'auth.jwt_claim'
    }
  ))
  .use(new BodyParser())
  .use((ctx, next) => {
    ctx.response.set(
      'Content-Type',
      typeof ctx.body === 'object' ? 'application/json; utf-8' : 'text/plain'
    );
    ctx.response.set('Access-Control-Allow-Origin', '*');
    ctx.response.set('Access-Control-Request-Method', 'GET, POST, PUT');
    ctx.response.set(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept'
    );
    return next();
  })
  .use(router.routes())
  .use(router.allowedMethods())
  .listen(8080);
