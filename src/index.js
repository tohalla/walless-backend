const production = process.env.NODE_ENV === 'production';
if (!production) process.env.JWT_SECRET = 'd';

import postgraphql from 'postgraphql';
import Koa from 'koa';
import Router from 'koa-router';
import AWS from 'aws-sdk';
import stripe from 'stripe';
import path from 'path';
import helmet from 'koa-helmet';

import notificationHandler from 'notificationHandler';
import dbConfig from 'db';
import translation from 'translation.router';
import auth from 'auth/auth.router';
import upload from 'upload.router';
import servingLocation from './servingLocation.router';

const router = new Router()
  .use(auth.routes(), auth.allowedMethods())
  .use(translation.routes(), translation.allowedMethods())
  .use(upload.routes(), upload.allowedMethods())
  .use(servingLocation.routes(), servingLocation.allowedMethods());

const app = new Koa();

app.context.s3 = new AWS.S3({
  region: 'ams3',
  accessKeyId: 'UQ6NJVP2VPAPOYICXLLJ',
  secretAccessKey: '02Elq/AkKd1/cXD5bmDjGLG4lNuuguMcuTAtRma95MI',
  endpoint: {
    hostname: 'ams3.digitaloceanspaces.com'
  }
});

app.context.stripe = stripe({});

app.use((ctx, next) => {
  ctx.response.set('Access-Control-Allow-Credentials', true);
  ctx.response.set('Access-Control-Request-Method', 'GET, POST, PUT, OPTIONS');
  ctx.response.set(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, Client-Id'
  );
  return next();
});

if (production) {
  app.use((ctx, next) => {
    ctx.response.set(
      'Access-Control-Allow-Origin',
      'https://management.walless.fi'
    );
    return next();
  });
} else {
  app.use((ctx, next) => {
    ctx.response.set('Access-Control-Allow-Origin', 'http://localhost:3000');
    return next();
  });
}

app
  .use(helmet())
  .use(postgraphql(
    dbConfig.pg,
    [dbConfig.defaultSchema, 'auth'],
    {
      exportJsonSchemaPath: path.resolve(__dirname, '..', 'schema.json'),
      development: !production,
      disableDefaultMutations: true,
      disableQueryLog: production,
      graphiql: !production,
      jwtSecret: process.env.JWT_SECRET,
      pgDefaultRole: 'guest',
      watchPg: !production,
      jwtPgTypeIdentifier: 'auth.jwt_claim'
    }
  ))
  .use((ctx, next) => {
    ctx.response.set(
      'Content-Type',
      typeof ctx.body === 'object' ? 'application/json; utf-8' : 'text/plain'
    );
    return next();
  })
  .use(router.routes())
  .use(router.allowedMethods());

notificationHandler(app.listen(8080));
