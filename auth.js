import Router from 'koa-router';
import jwt from 'jsonwebtoken';

import {query} from './utilities/query';

const tokenIsValid = async (user, token) => (await query(
  'SELECT auth.validation_token_exists($1::integer, $2::text)',
  [user, token]
))[0].validation_token_exists;

export default new Router({prefix: 'auth'})
  .post('/', async (ctx, next) => {
    const {email, password} = ctx.request.fields;
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
  .post('/renewToken', async (ctx, next) => {
    const {token} = ctx.request.fields;
    try {
      const decoded = await jwt.verify(token, process.env.JWT_SECRET);
      const {exp, iat, aud, sub, ...rest} = decoded; // eslint-disable-line
      const renewedToken = await jwt.sign(rest, process.env.JWT_SECRET, {
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
  .put('/', async (ctx, next) => {
    const {user, token} = ctx.request.fields;
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
        ctx.status = 200;
      } else {
        ctx.status = 401;
      }
    }
    ctx.status = 404;
    return next();
  });
