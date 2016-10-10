import express from 'express';
import jwt from 'jsonwebtoken';
import {camelizeKeys} from 'humps';

import {query} from './utilities/query';

const tokenIsValid = async (user, token) => (await query(
  'SELECT auth.validation_token_exists($1::integer, $2::text)',
  [user, token]
))[0].validation_token_exists;

export default express()
  .get('/validToken', async (req, res, next) => {
    const {user, token} = req.query;
    if (
      user &&
      token
    ) {
      res.json({isValid: await tokenIsValid(user, token)});
      return next();
    }
    res.send({isValid: false});
    return next();
  })
  .post('/', async (req, res, next) => {
    const {email, password} = req.body;
    if (email && password) {
      try {
        const claim = (await query(
          'SELECT * FROM auth.authenticate($1::TEXT, $2::TEXT)',
          [email, password]
        ))[0];
        const token = await jwt.sign(claim, process.env.JWT_SECRET, {
          subject: 'postgraphql'
        });
        res.json({token});
      } catch (err) {
        res.status(401).json(err);
      }
    } else {
      res.sendStatus(401);
    }
    return next();
  })
  .post('/account', async (req, res, next) => {
    const claim = await jwt.verify(req.body.token, process.env.JWT_SECRET, {
      subject: 'postgraphql'
    });
    const user = (await query(`
      SELECT
        account.first_name::TEXT,
        account.last_name::TEXT,
        email.email::TEXT,
        account.id::INTEGER
      FROM account
        JOIN email ON account.email = email.id
      WHERE account.id = $1::INTEGER
    `, [claim.account_id]))[0];
    res.json(camelizeKeys(user));
    return next();
  })
  .put('/', async (req, res, next) => {
    const {user, token} = req.body;
    if (token && user && user.id && user.password) {
      if (await tokenIsValid(user.id, token)) {
        await query(
          'UPDATE auth.login SET password = $1::TEXT, VALIDATED = TRUE WHERE id = $2::INTEGER AND VALIDATED = FALSE',
          [user.password, user.id]
        );
        await query(
          'DELETE FROM auth.validation_token WHERE token = $1::TEXT',
          [token]
        );
        res.sendStatus(200);
      } else {
        res.sendStatus(401);
      }
    }
    res.sendStatus(404);
    return next();
  });
