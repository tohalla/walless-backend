import Router from 'koa-router';
import fs from 'fs';

const uploadParams = {
  Bucket: 'walles-static'
};

export default new Router({prefix: '/upload'})
  .post('/', (ctx, next) => {
    ctx.request.files.forEach(file => {
      const fileStream = fs.createReadStream(file.path);
      ctx.s3.upload(
        Object.assign({}, uploadParams, {
          ContentType: file.type,
          Body: fileStream,
          Key: file.name
        }),
        (err, data) => {
          console.log(data);
        }
      );
    });
    return next();
  });
