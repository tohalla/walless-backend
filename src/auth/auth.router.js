import Router from 'koa-router';
import jwt from 'jsonwebtoken';
import koaBody from 'koa-body';
import {get, omit} from 'lodash/fp';

import pool from 'pool';
import {defaultSchema} from 'db';
import client from 'auth/client.router.js';
import account from 'auth/account.router.js';
import {sendEmailPasswordReset} from 'mailer';

const cookieConf = {
  httpOnly: false,
  overwrite: true,
  domain: process.env.NODE_ENV === 'production' ? '.walless.fi' : 'localhost'
};

export default new Router({prefix: 'auth'})
  .post('/', koaBody(), async (ctx, next) => {
    const {body: {email, password}} = ctx.request;
    if (email && password) {
      const client = await pool.connect();
      try {
        const claim = get(['rows', 0])(await client.query(
          'SELECT * FROM auth.authenticate(LOWER($1::TEXT), $2::TEXT)',
          [email, password]
        )) || {}; // expires in 1h
        if (!claim.account_id) {
          throw Error('error.invalidAuthenticationInformation');
        }
        const token = await jwt.sign({...claim}, process.env.JWT_SECRET, {
          subject: 'postgraphql',
          audience: 'postgraphql'
        });
        const wsToken = await jwt.sign(
          {user: claim.account_id},
          process.env.JWT_SECRET,
          {subject: 'ws', audience: 'ws'}
        );
        if (ctx.header['client-id']) {
          const refreshToken = get(['rows', 0, 'refresh_token'])(
            await client.query(
              `UPDATE auth.client SET
                account=$1::INTEGER, refresh_token = gen_random_uuid()
              WHERE id=$2::TEXT
              RETURNING refresh_token`,
              [claim.account_id, ctx.header['client-id']]
            )
          );
          ctx.body = {token, wsToken, expiresAt: claim.exp, refreshToken};
          return next();
        }
        ctx.cookies.set('authorization', token, cookieConf);
        ctx.cookies.set('ws-token', wsToken, cookieConf);
        ctx.cookies.set('expiration', claim.exp, cookieConf);
        ctx.redirect(ctx.headers.referer);
      } catch ({message}) {
        ctx.status = 401;
        ctx.cookies.set('error', message, cookieConf);
        ctx.redirect(ctx.headers.referer);
      } finally {
        client.release();
      }
    } else {
      ctx.status = 401;
    }
  })
  .post('/password', koaBody(), async (ctx, next) => {
    const {
      body: {currentPassword, password, email, token: resetToken}
    } = ctx.request;
    const token = ctx.header.authorization
      ? ctx.header.authorization.replace('Bearer ', '')
      : null;
    const client = await pool.connect();
    try {
      if (token) {
        const {account_id: accountId} = await jwt.verify(
          token,
          process.env.JWT_SECRET
        );
        const {
          rows: [{correct_password: correctPassword}]
        } = await client.query(
          `SELECT crypt($1::TEXT, login.password) = login.password AS correct_password FROM auth.login
            WHERE login.id = $2::INTEGER`,
          [currentPassword, accountId]
        );
        if (!correctPassword) new Error('account.invalidPassword');
        await client.query(
          'UPDATE auth.login SET password=$1::TEXT WHERE id = $2::INTEGER',
          [password, accountId]
        );
      } else if (resetToken) {
        const id = get(['rows', 0, 'id'])(await client.query(
          `SELECT id FROM ${defaultSchema}.account
            JOIN auth.reset_token ON reset_token.account = account.id
          WHERE email = $1::TEXT AND reset_token.token = $2`,
          [email, resetToken]
        ));
        if (!id) throw Error('error.invalidResetToken');
        await client.query(
          'UPDATE auth.login SET password=$1::TEXT WHERE id = $2::INTEGER',
          [password, id]
        );
        await client.query(
          'delete from auth.reset_token WHERE account = $1::INTEGER',
          [id]
        );
      } else {
        ctx.throw(400);
      }
      ctx.body = {message: 'message.passwordUpdated'};
      ctx.status = 200;
    } catch ({message}) {
      ctx.body = {message};
      ctx.status = 401;
    } finally {
      client.release();
    }
  })
  .post('/request-reset', koaBody(), async (ctx, next) => {
    const {body: {email}} = ctx.request;
    if (ctx.header.authorization) {
      ctx.status = 401;
    } else {
      const client = await pool.connect();
      try {
        const {id, first_name: firstName} = get(['rows', 0])(await client.query(
          `SELECT id, email, first_name FROM ${
            defaultSchema
          }.account WHERE email = $1::TEXT`,
          [email]
        )) || {};
        if (!id) throw Error('error.invalidAuthenticationInformation');
        await client.query(
          'DELETE FROM auth.reset_token WHERE account = $1::INTEGER',
          [id]
        );
        const {rows: [{token: resetToken}]} = await client.query(
          'INSERT INTO auth.reset_token (account) VALUES ($1::INTEGER) RETURNING token',
          [id]
        );
        await sendEmailPasswordReset(email, {
          firstName,
          resetLink: `https://management.walless.fi/authentication.html?action=reset&email=${
            email
          }&token=${resetToken}`
        });
        ctx.body = {message: 'message.resetEmailSent'};
        ctx.status = 201;
      } catch ({message}) {
        ctx.body = {message};
        ctx.status = 400;
      } finally {
        client.release();
      }
    }
  })
  .post('/renewToken', async (ctx, next) => {
    const token = ctx.header.authorization
      && ctx.header.authorization.replace('Bearer ', '');
    try {
      const decoded = await jwt.verify(token, process.env.JWT_SECRET);
      const renewedToken = await jwt.sign(
        omit(['exp', 'iat', 'aud', 'sub'])(decoded),
        process.env.JWT_SECRET,
        {
          subject: 'postgraphql',
          audience: 'postgraphql'
        }
      );
      const wsToken = await jwt.sign(
        {user: decoded.account_id},
        process.env.JWT_SECRET,
        {
          subject: 'ws',
          audience: 'ws'
        }
      );
      ctx.cookies.set('authorization', renewedToken, cookieConf);
      ctx.cookies.set('ws-token', wsToken, cookieConf);
      ctx.cookies.set('expiration', Date.now() / 1000 + 3600, cookieConf);
      ctx.status = 200;
    } catch (err) {
      ctx.status = 401;
    }
  })
  .use(client.routes(), client.allowedMethods())
  .use(account.routes(), account.allowedMethods());
