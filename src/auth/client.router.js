import Router from 'koa-router';
import jwt from 'jsonwebtoken';

import pool from 'pool';

export default new Router({prefix: 'client'})
  .get('/', async (ctx, next) => {
    if (ctx.header['refresh-token'] && ctx.header['client-id']) {
      const {rows: [claim]} = await pool.query(
        'SELECT * FROM auth.authenticate_with_refresh_token($1::TEXT, $2::TEXT)',
        [ctx.header['client-id'], ctx.header['refresh-token']]
      );
      if (claim) {
        const token = await jwt.sign({...claim}, process.env.JWT_SECRET, {
          subject: 'postgraphql',
          audience: 'postgraphql'
        });
        const wsToken = await jwt.sign({user: claim.account_id}, process.env.JWT_SECRET, {
          subject: 'ws',
          audience: 'ws'
        });
        ctx.body = {wsToken, token, expiresAt: claim.exp};
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
