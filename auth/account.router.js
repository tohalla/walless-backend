import Router from 'koa-router';
import koaBody from 'koa-body';
import config from 'config';
import jwt from 'jsonwebtoken';

import {defaultSchema} from '../db';
import pool from '../pool';
import mailer from '../mailer';

const mail = config.get('mail');
const jwtSecret = config.get('jwtSecret');

export default new Router({prefix: 'account'})
  .post('/', koaBody(), async(ctx, next) => {
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
      const {rows: [{token: validationToken}]} = await client.query(
        'SELECT token FROM auth.validation_token WHERE account = $1::INTEGER',
        [accountId]
      );
      await mailer.sendMail({
        from: `"Walless" <${mail.auth.user}>`,
        to: email,
        subject: 'Walless account validation',
        text: validationToken
      });
      ctx.status = 201;
    } catch (err) {
      ctx.status = 401;
      ctx.body = err;
    } finally {
      client.release();
    }
    return next();
  })
  .post('/validate', koaBody(), async(ctx, next) => {
    const {body: {validationToken}} = ctx.request;
    const token = ctx.header.authorization ?
      ctx.header.authorization.replace('Bearer ', '') : null;
    if (token && validationToken) {
      const client = await pool.connect();
      try {
        const {account_id: accountId} = await jwt.verify(token, jwtSecret);
        const {rows: [valid]} = await client.query(
          'SELECT auth.validation_token_exists($1::INTEGER, $2::TEXT)',
          [accountId, validationToken]
        );
        if (valid) {
          await client.query(
            'UPDATE auth.login SET VALIDATED = TRUE WHERE id = $1::INTEGER AND VALIDATED = FALSE',
            [accountId]
          );
          await client.query(
            'DELETE FROM auth.validation_token WHERE id = $1::INTEGER',
            [accountId]
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
