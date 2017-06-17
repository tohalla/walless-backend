import Router from 'koa-router';
import sharp from 'sharp';
import koaBody from 'koa-body';

import {defaultSchema} from './db';
import jwt from 'jsonwebtoken';
import {query} from './utilities/query';

const uploadParams = {
  Bucket: 'walles-static'
};

export default new Router({prefix: '/upload'})
  .post('/', koaBody({multipart: true}), async(ctx, next) => {
    const {header: {authorization}, request: {body: {files, fields}}} = ctx;
    if (authorization && files && fields && fields.restaurant ) {
      try {
        const {account_id: accountId} = await jwt.verify(
          authorization.replace('Bearer ', ''),
          process.env.JWT_SECRET
        );
        const [{allow_upload_file: allowUploadFile}]= (await query(`
            SELECT allow_upload_file FROM ${defaultSchema}.restaurant_account
              JOIN ${defaultSchema}.restaurant_role_rights ON restaurant_role_rights.id = restaurant_account.role
            WHERE restaurant_account.restaurant = $2::INTEGER AND account = $1::INTEGER
          `,
          [accountId, fields.restaurant]
        ));
        if (!allowUploadFile) {
          throw Error({status: 401});
        }
        const data = await Promise.all(Object.keys(files).reduce((prev, curr) =>
          files[curr].path ?
            prev.concat(new Promise(async(resolve, reject) => {
              const buffer = sharp(files[curr].path);
              const metadata = await buffer.metadata();
              const image = await buffer
                .resize(metadata.width < 640 ? metadata.width : 640)
                .flatten()
                .jpeg({quality: 90});
              ctx.s3.upload(
                Object.assign({}, uploadParams, {
                  ContentType: files[curr].type,
                  Body: image,
                  Key: `${Math.random().toString(36).substr(2, 4)}-${fields.restaurant}/${files[curr].name}`
                }),
                (err, data) => {
                  if (err) {
                    return reject(err);
                  }
                  query(`
                      INSERT INTO ${defaultSchema}.file (created_by, restaurant, key, uri)
                        VALUES ($1::INTEGER, $2::INTEGER, $3::TEXT, $4::TEXT)
                      RETURNING id
                    `,
                    [
                      accountId,
                      fields.restaurant,
                      data.Key,
                      data.Location
                    ]
                  )
                    .then(file => resolve(Array.isArray(file) ? file[0].id : file));
                }
              );
            })) : prev
        , []));
        ctx.body = data;
        ctx.status = 201;
      } catch (err) {
        ctx.status = err.status || 400;
      }
      return next();
    }
    ctx.status = 400;
  });
