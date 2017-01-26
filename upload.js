import Router from 'koa-router';
import sharp from 'sharp';

import jwt from 'jsonwebtoken';
import {query} from './utilities/query';

const uploadParams = {
  Bucket: 'walles-static'
};

export default new Router({prefix: '/upload'})
  .post('/', async (ctx, next) => {
      if (
        ctx.header.authorization &&
        ctx.request.files &&
        ctx.request.fields &&
        ctx.request.fields.restaurant
      ) {
        try {
          const {account_id: accountId} = await jwt.verify(
            ctx.header.authorization.replace('Bearer ', ''),
            process.env.JWT_SECRET
          );
          const {allow_upload_file: allowUploadFile} = (await query(`
              SELECT allow_upload_file FROM restaurant_account
                JOIN restaurant_role_rights ON restaurant_role_rights.id = restaurant_account.role
              WHERE restaurant_account.restaurant = $2::INTEGER AND account = $1::INTEGER
            `,
            [accountId, ctx.request.fields.restaurant]
          ))[0];
          if (!allowUploadFile) {
            throw Error({status: 401});
          }
          const data = await Promise.all(ctx.request.files.reduce((prev, curr) =>
            curr.path ?
              prev.concat(new Promise(async (resolve, reject) => {
                const buffer = sharp(curr.path);
                const image = await buffer
                  .metadata((err, metadata) => buffer.resize(
                    metadata.width < 960 ? metadata.width : 960
                  ))
                  .flatten()
                  .jpeg({quality: 90});
                ctx.s3.upload(
                  Object.assign({}, uploadParams, {
                    ContentType: curr.type,
                    Body: image,
                    Key: `${Math.random().toString(36).substr(2, 4)}-${ctx.request.fields.restaurant}/${curr.name}`
                  }),
                  (err, data) => {
                    if (err) {
                      return reject(err);
                    }
                    query(`
                        INSERT INTO file (created_by, restaurant, key, uri)
                          VALUES ($1::INTEGER, $2::INTEGER, $3::TEXT, $4::TEXT)
                        RETURNING id
                      `,
                      [
                        accountId,
                        ctx.request.fields.restaurant,
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
