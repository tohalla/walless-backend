import Router from 'koa-router';
import jwt from 'jsonwebtoken';
import config from 'config';

import pool from '../pool';
const jwtSecret = config.get('jwtSecret');

export default new Router({prefix: 'client'})
  .get('/', async (ctx, next) => {
    if (ctx.header['refresh-token'] && ctx.header['client-id']) {
      const {rows: [claim]} = await pool.query(
        'SELECT * FROM auth.authenticate_with_refresh_token($1::TEXT, $2::TEXT)',
        [ctx.header['client-id'], ctx.header['refresh-token']]
      );
      if (claim) {
        const token = await jwt.sign({...claim}, jwtSecret, {
          subject: 'postgraphql',
          audience: 'postgraphql'
        });
        ctx.body = {token, expiresAt: claim.exp};
      } else {
        ctx.status = 401;
      }
    }
  })
  .post('/', async (ctx, next) => {
    if (ctx.header['client-id'] && ctx.header['device']) {
      throw Error('Header already contains clientId');
    }
    const {rows: [{id: clientId}]} = await pool.query(
      'INSERT INTO auth.client (device) VALUES ($1::TEXT) RETURNING id',
      [ctx.header['device']]
    );
    ctx.body = {clientId};
    return next();
  })
  .delete('/', async (ctx, next) => {
    if (ctx.header['client-id']) {
      await pool.query(
        'DELETE FROM auth.client WHERE id=$1::TEXT',
        [ctx.header['client-id']]
      );
      ctx.status = 200;
    } else {
      ctx.status = 406;
      throw Error('Header doesn\'t containain clientId');
    }
  });
