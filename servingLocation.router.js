import Router from 'koa-router';
import koaBody from 'koa-body';

export default new Router({prefix: 'auth'})
  .post('/', koaBody(), async(ctx, next) => {
    return next();
  });
