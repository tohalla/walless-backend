import express from 'express';
import jwt from 'jsonwebtoken';

import {query} from './utilities/query';

const tokenIsValid = async (user, token) => (await query(
  'SELECT auth.validation_token_exists($1::integer, $2::text)',
  [user, token]
))[0].validation_token_exists;

export default express()
  .post('/', async (req, res, next) => {
    const {email, password} = req.body;
    if (email && password) {
      try {
        const claim = (await query(
          'SELECT * FROM auth.authenticate($1::TEXT, $2::TEXT)',
          [email, password]
        ))[0]; // expires in 1h
        const token = await jwt.sign(claim, process.env.JWT_SECRET, {
          subject: 'postgraphql',
          audience: 'postgraphql'
        });
        res.json({token, expiresAt: claim.exp});
      } catch (err) {
        res.status(401).json(err);
      }
    } else {
      res.sendStatus(401);
    }
    return next();
  })
  .post('/renewToken', async (req, res, next) => {
    const {token} = req.body;
    try {
      const decoded = await jwt.verify(token, process.env.JWT_SECRET);
      const {exp, iat, aud, sub, ...rest} = decoded; // eslint-disable-line
      res.json(await jwt.sign(rest, process.env.JWT_SECRET, {
        subject: 'postgraphql',
        audience: 'postgraphql',
        expiresIn: 3600
      }));
    } catch (err) {
      console.log(err);
    }
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
