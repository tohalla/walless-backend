import Router from 'koa-router';

import {query} from './utilities/query';

export default new Router({prefix: '/translation'})
  .get('/', async (ctx, next) => {
    ctx.body = await query('SELECT * FROM translation.language');
    return next();
  })
  .get('/:lang', async (ctx, next) => {
    ctx.body = (await query(
      'SELECT translation.key, translation.translation FROM translation.language JOIN translation.translation ON translation.language = locale WHERE locale = $1::text',
      [ctx.params.lang]
    ))
      .reduce((prev, curr) =>
        Object.assign({}, prev, {[curr.key]: curr.translation}), {}
      );
    return next();
  });
