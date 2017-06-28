import Router from 'koa-router';
import koaBody from 'koa-body';

import {defaultSchema} from '../db';
import pool from '../pool';

export default new Router({prefix: 'account'})
  .post('/', koaBody(), async(ctx, next) => {
    const {body: {email, firstName, lastName}} = ctx.request;
    try {
      await pool.query(
        `INSERT INTO ${defaultSchema}.account (email, first_name, last_name) VALUES
          ($1::TEXT, $2::TEXT, $3::TEXT)`,
        [email, firstName, lastName]
      );
      ctx.status = 201;
    } catch (err) {
      ctx.status = 401;
      ctx.body = err;
    }
    return next();
  })
  .post('/validate', koaBody(), async(ctx, next) => {
    const {body: {account, token}} = ctx.request;
    if (token && account && account.id && account.password) {
      const client = await pool.connect();
      try {
        const {rows: [valid]} = await client.query(
          'SELECT auth.validation_token_exists($1::integer, $2::text)',
          [account.id, token]
        );
        if (valid) {
          await client.query(
            'UPDATE auth.login SET password = $1::TEXT, VALIDATED = TRUE WHERE id = $2::INTEGER AND VALIDATED = FALSE',
            [account.password, account.id]
          );
          await client.query(
            'DELETE FROM auth.validation_token WHERE token = $1::TEXT',
            [token]
          );
          ctx.status = 202;
        } else {
          ctx.status = 401;
        }
      } finally {
        client.release();
      }
    } else {
      ctx.status = 400;
    }
  });
