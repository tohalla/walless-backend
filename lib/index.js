import postgraphql from 'postgraphql';
import Koa from 'koa';
import Router from 'koa-router';
import AWS from 'aws-sdk';
import config from 'config';
import stripe from 'stripe';
import path from 'path';
import {createServer} from 'http';

import notificationHandler from './notificationHandler';
import dbConfig from '../db';
import translation from './translation.router';
import auth from './auth/auth.router';
import upload from './upload.router';
import servingLocation from './servingLocation.router';

const router = new Router()
  .use(auth.routes(), auth.allowedMethods())
  .use(translation.routes(), translation.allowedMethods())
  .use(upload.routes(), upload.allowedMethods())
  .use(servingLocation.routes(), servingLocation.allowedMethods());

AWS.config.loadFromPath('./config/awsConfig.json');

const app = new Koa();
app.context.s3 = new AWS.S3();
app.context.stripe = stripe(config.get('stripe.apiKey'));

app
  .use(postgraphql(
    dbConfig.pg,
    [dbConfig.defaultSchema, 'auth'],
    {
      enableCors: process.env.NODE_ENV === 'development',
      exportJsonSchemaPath: path.resolve(__dirname, 'schema.json'),
      development: process.env.NODE_ENV === 'development',
      disableDefaultMutations: true,
      disableQueryLog: process.env.NODE_ENV === 'production',
      graphiql: process.env.NODE_ENV === 'development',
      jwtSecret: process.env.JWT_SECRET || '',
      pgDefaultRole: 'guest',
      watchPg: process.env.NODE_ENV === 'development',
      jwtPgTypeIdentifier: 'auth.jwt_claim'
    }
  ))
  .use((ctx, next) => {
    ctx.response.set(
      'Content-Type',
      typeof ctx.body === 'object' ? 'application/json; utf-8' : 'text/plain'
    );
    ctx.response.set('Access-Control-Allow-Origin', '*');
    ctx.response.set('Access-Control-Request-Method', 'GET, POST, PUT');
    ctx.response.set(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );
    return next();
  })
  .use(router.routes())
  .use(router.allowedMethods());

const server = createServer(app.callback());

notificationHandler(server);

server.listen(8080);
