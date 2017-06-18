import Router from 'koa-router';
import jwt from 'jsonwebtoken';
import koaBody from 'koa-body';
import config from 'config';

import {query} from './utilities/query';
const jwtSecret = config.get('jwtSecret');

const tokenIsValid = async(user, token) => (await query(
  'SELECT auth.validation_token_exists($1::integer, $2::text)',
  [user, token]
))[0].validation_token_exists;

export default new Router({prefix: 'auth'})
  .post('/', koaBody({multipart: true}), async(ctx, next) => {
    const {body: {email, password}} = ctx.request;
    if (email && password) {
      try {
        const [claim] = (await query(
          'SELECT * FROM auth.authenticate(LOWER($1::TEXT), $2::TEXT)',
          [email, password]
        )); // expires in 1h
        const token = await jwt.sign(claim, jwtSecret, {
          subject: 'postgraphql',
          audience: 'postgraphql'
        });
        if (ctx.header['client-id']) {
          const [{refresh_token: refreshToken}] = await query(
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
      }
    } else {
      ctx.status = 401;
    }
    return next();
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
    return next();
  })
  .put('/', koaBody({multipart: true}), async(ctx, next) => {
    const {body: {user, token}} = ctx.request;
    if (token && user && user.id && user.password) {
      const valid = await tokenIsValid(user.id, token);
      if (valid) {
        await query(
          'UPDATE auth.login SET password = $1::TEXT, VALIDATED = TRUE WHERE id = $2::INTEGER AND VALIDATED = FALSE',
          [user.password, user.id]
        );
        await query(
          'DELETE FROM auth.validation_token WHERE token = $1::TEXT',
          [token]
        );
        ctx.status = 200;
      } else {
        ctx.status = 401;
      }
    } else {
      ctx.status = 400;
    }
    return next();
  })
  // client
  .get('/client', async(ctx, next) => {
    if (ctx.header['refresh-token'] && ctx.header['client-id']) {
      const [claim] = await query(
        'SELECT * FROM auth.authenticate_with_refresh_token($1::TEXT, $2::TEXT)',
        [ctx.header['client-id'], ctx.header['refresh-token']]
      );
      const token = await jwt.sign(claim, jwtSecret, {
        subject: 'postgraphql',
        audience: 'postgraphql'
      });
      ctx.body = {token, expiresAt: claim.exp};
    }
    return next();
  })
  .post('/client', async(ctx, next) => {
    if (ctx.header['client-id'] && ctx.header['device']) {
      throw Error('Header already contains clientId');
    }
    const [{id: clientId}] = await query(
      'INSERT INTO auth.client (device) VALUES ($1::TEXT) RETURNING id',
      [ctx.header['device']]
    );
    ctx.body = {clientId};
    return next();
  })
  .delete('/client', async(ctx, next) => {
    if (ctx.header['client-id']) {
      await query(
        'DELETE FROM auth.client WHERE id=$1::TEXT',
        [ctx.header['client-id']]
      );
      ctx.status = 200;
      return next();
    }
    ctx.status = 406;
    throw Error('Header doesn\'t containain clientId');
  });
