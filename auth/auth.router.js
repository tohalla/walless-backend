import Router from 'koa-router';
import jwt from 'jsonwebtoken';
import koaBody from 'koa-body';
import config from 'config';

import pool from '../pool';
import client from './client.router.js';
import account from './account.router.js';

const jwtSecret = config.get('jwtSecret');

export default new Router({prefix: 'auth'})
  .post('/', koaBody(), async(ctx, next) => {
    const {body: {email, password}} = ctx.request;
    if (email && password) {
      const client = await pool.connect();
      try {
        const {rows: [claim]} = await client.query(
          'SELECT * FROM auth.authenticate(LOWER($1::TEXT), $2::TEXT)',
          [email, password]
        ); // expires in 1h
        const token = await jwt.sign(claim, jwtSecret, {
          subject: 'postgraphql',
          audience: 'postgraphql'
        });
        if (ctx.header['client-id']) {
          const {rows: [{refresh_token: refreshToken}]} = await client.query(
            `
              UPDATE auth.client SET
                account=$1::INTEGER, refresh_token = gen_random_uuid()
              WHERE id=$2::TEXT
              RETURNING refresh_token
            `,
            [claim.account_id, ctx.header['client-id']]
          );
          ctx.body = {token, expiresAt: claim.exp, refreshToken};
          return next();
        }
        ctx.body = {token, expiresAt: claim.exp};
      } catch (err) {
        ctx.status = 401;
        ctx.body = err;
      } finally {
        client.release();
      }
    } else {
      ctx.status = 401;
    }
  })
  .put('/password', koaBody(), async(ctx, next) => {
    const {body: {
      currentPassword,
      password
    }} = ctx.request;
    const token = ctx.header.authorization ?
      ctx.header.authorization.replace('Bearer ', '') : null;
    if (token) {
      const {account_id: accountId} = await jwt.verify(token, jwtSecret);
      const client = await pool.connect();
      try {
        const {rows: [{correct_password: correctPassword}]} = await client.query(
          `SELECT crypt($1::TEXT, login.password) = login.password AS correct_password FROM auth.login
            WHERE login.id = $2::INTEGER`,
          [currentPassword, accountId]
        );
        if (!correctPassword) {
          throw Error('Invalid password');
        }
        await client.query(
          'UPDATE auth.login SET password=$1::TEXT WHERE id = $2::INTEGER',
          [password, accountId]
        );
        ctx.status = 200;
      } catch (err) {
        ctx.body = err;
        ctx.status = 401;
      } finally {
        client.release();
      }
    }
  })
  .post('/renewToken', async(ctx, next) => {
    const token = ctx.header.authorization ?
      ctx.header.authorization.replace('Bearer ', '') : null;
    try {
      const decoded = await jwt.verify(token, jwtSecret);
      const {exp, iat, aud, sub, ...rest} = decoded; // eslint-disable-line
      const renewedToken = await jwt.sign(rest, jwtSecret, {
        subject: 'postgraphql',
        audience: 'postgraphql',
        expiresIn: 3600
      });
      ctx.body = {token: renewedToken, expiresAt: Date.now() / 1000 + 3600};
    } catch (err) {
      console.log(err);
    }
  })
  .use(client.routes(), client.allowedMethods())
  .use(account.routes(), account.allowedMethods());
