import Router from 'koa-router';
import jwt from 'jsonwebtoken';
import koaBody from 'koa-body';

import mailer from 'mailer';
import pool from 'pool';
import {defaultSchema} from 'db';
import client from 'auth/client.router.js';
import account from 'auth/account.router.js';

export default new Router({prefix: 'auth'})
  .post('/', koaBody(), async (ctx, next) => {
    const {body: {email, password}} = ctx.request;
    if (email && password) {
      const client = await pool.connect();
      try {
        const {rows: [claim]} = await client.query(
          'SELECT * FROM auth.authenticate(LOWER($1::TEXT), $2::TEXT)',
          [email, password]
        ); // expires in 1h
        if (!claim.account_id) {
          new Error('invalidAuthenticationInformation');
        }
        const token = await jwt.sign({...claim}, process.env.JWT_SECRET, {
          subject: 'postgraphql',
          audience: 'postgraphql'
        });
        const wsToken = await jwt.sign({user: claim.account_id}, process.env.JWT_SECRET, {
          subject: 'ws',
          audience: 'ws'
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
          ctx.body = {token, wsToken, expiresAt: claim.exp, refreshToken};
          return next();
        }
        const cookieConf = {
          httpOnly: false,
          overwrite: true,
          domain: process.env.NODE_ENV === 'production' ?
            '.walless.fi' : 'localhost'
        };
        ctx.cookies.set('Authorization', token, cookieConf);
        ctx.cookies.set('ws-token', wsToken, cookieConf);
        ctx.cookies.set('Expiration', claim.exp, cookieConf);
        ctx.redirect(ctx.headers.referer);
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
  .put('/password', koaBody(), async (ctx, next) => {
    const {body: {
      currentPassword,
      password
    }} = ctx.request;
    const token = ctx.header.authorization ?
      ctx.header.authorization.replace('Bearer ', '') : null;
    if (token) {
      const {account_id: accountId} = await jwt.verify(token, process.env.JWT_SECRET);
      const client = await pool.connect();
      try {
        const {rows: [{correct_password: correctPassword}]} = await client.query(
          `SELECT crypt($1::TEXT, login.password) = login.password AS correct_password FROM auth.login
            WHERE login.id = $2::INTEGER`,
          [currentPassword, accountId]
        );
        if (!correctPassword) {
          new Error('invalidPassword');
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
  .delete('/password', async (ctx, next) => {
    const token = ctx.header.authorization ?
      ctx.header.authorization.replace('Bearer ', '') : null;
    if (token) {
      const client = await pool.connect();
      try {
        const {account_id: accountId} = await jwt.verify(token, process.env.JWT_SECRET);
        await client.query(
          'DELETE auth.reset_token WHERE account = $1::INTEGER',
          [accountId]
        );
        const {rows: [{token: resetToken}]} = await client.query(
          'INSERT INTO auth.reset_token (account) VALUES ($1::INTEGER) RETURNING token',
          [accountId]
        );
        const {rows: [{email}]} = await client.query(
          `SELECT email FROM ${defaultSchema}.account WHERE id = $1::INTEGER`,
          [accountId]
        );
        await mailer.sendMail({
          from: `"Walless" <walless@walless.fi>`,
          to: email,
          subject: 'Walless account validation',
          text: resetToken
        });
        ctx.status = 201;
      } finally {
        client.release();
      }
    } else {
      ctx.status = 401;
    }
  })
  .post('/renewToken', async (ctx, next) => {
    const token = ctx.header.authorization ?
      ctx.header.authorization.replace('Bearer ', '') : null;
    try {
      const decoded = await jwt.verify(token, process.env.JWT_SECRET);
      const {exp, iat, aud, sub, ...rest} = decoded; // eslint-disable-line
      const renewedToken = await jwt.sign(rest, process.env.JWT_SECRET, {
        subject: 'postgraphql',
        audience: 'postgraphql'
      });
      const wsToken = await jwt.sign({user: rest.account_id}, process.env.JWT_SECRET, {
        subject: 'ws',
        audience: 'ws'
      });
      ctx.body = {
        token: renewedToken,
        wsToken,
        expiresAt: Date.now() / 1000 + 3600
      };
    } catch (err) {
    }
  })
  .use(client.routes(), client.allowedMethods())
  .use(account.routes(), account.allowedMethods());
