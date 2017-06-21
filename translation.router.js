import Router from 'koa-router';

import pool from './pool';

export default new Router({prefix: '/translation'})
  .get('/', async(ctx, next) => {
    const {rows: languages} = await pool.query('SELECT * FROM translation.language');
    ctx.body = languages;
    return next();
  })
  .get('/:lang', async(ctx, next) => {
    const {rows: translations} = await pool.query(
      'SELECT translation.key, translation.translation FROM translation.language JOIN translation.translation ON translation.language = locale WHERE locale = $1::text',
      [ctx.params.lang]
    );
    ctx.body = translations.reduce((prev, curr) =>
      Object.assign({}, prev, {[curr.key]: curr.translation}), {}
    );
    return next();
  });
