import Router from 'koa-router';
import koaBody from 'koa-body';

import {defaultSchema} from 'db';
import pool from 'pool';
import {sendEmailVerification} from 'mailer';

export default new Router({prefix: 'account'})
  .post('/', koaBody(), async (ctx, next) => {
    const {body: {
      email,
      firstName,
      lastName,
      dateOfBirth,
      password
    }} = ctx.request;
    const client = await pool.connect();
    try {
      const {rows: [{id: accountId}]} = await pool.query(`
        INSERT INTO ${defaultSchema}.account (email, first_name, last_name, date_of_birth) VALUES
          ($1::TEXT, $2::TEXT, $3::TEXT, $4::DATE)
        RETURNING id`,
        [email, firstName, lastName, dateOfBirth]
      );
      await client.query(
        'UPDATE auth.login SET password=$1::TEXT WHERE id = $2::INTEGER',
        [password, accountId]
      );
      const {rows: [{token}]} = await client.query(
        'SELECT token FROM auth.email_verification_token WHERE email = $1::TEXT',
        [email]
      );
      await sendEmailVerification(
        email,
        {
          firstName,
          address: `https://walless.fi/verify?email=${email}&token=${token}`
        }
      );
      ctx.status = 201;
    } catch (err) {
      ctx.status = 401;
      ctx.body = err;
    } finally {
      client.release();
    }
    return next();
  })
  .get('/verify', koaBody(), async (ctx, next) => {
    const {query: {token, email}} = ctx.request;
    if (token) {
      const client = await pool.connect();
      try {
        const {rows: [valid]} = await client.query(
          'SELECT auth.email_verification_token_exists($1::TEXT, $2::TEXT)',
          [email, token]
        );
        if (valid) {
          await client.query(
            `UPDATE ${defaultSchema}.account SET email_verified = TRUE WHERE email = $1::TEXT`,
            [email]
          );
          await client.query(
            'DELETE FROM auth.email_verification_token WHERE email = $1::TEXT',
            [email]
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
