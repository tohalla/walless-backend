import Router from 'koa-router';
import sharp from 'sharp';
import koaBody from 'koa-body';
import config from 'config';

import {defaultSchema} from './db';
import jwt from 'jsonwebtoken';
import pool from './pool';

const jwtSecret = config.get('jwtSecret');

const uploadParams = {
  Bucket: 'walles-static'
};

export default new Router({prefix: '/upload'})
  .post('/image', koaBody({multipart: true}), async(ctx, next) => {
    const {header: {authorization}, request: {body: {files, fields}}} = ctx;
    if (authorization && files && fields && fields.restaurant ) {
      const client = await pool.connect();
      try {
        const {account_id: accountId} = await jwt.verify(
          authorization.replace('Bearer ', ''),
          jwtSecret
        );
        const {rows: [{allow_upload_image: allowUploadImage}]}= await client.query(`
            SELECT allow_upload_image FROM ${defaultSchema}.restaurant_account
              JOIN ${defaultSchema}.restaurant_role_rights ON restaurant_role_rights.id = restaurant_account.role
            WHERE restaurant_account.restaurant = $2::INTEGER AND account = $1::INTEGER
          `,
          [accountId, fields.restaurant]
        );
        if (!allowUploadImage) {
          ctx.throw(401);
        }
        const data = await Promise.all(Object.keys(files).reduce((prev, curr) =>
          files[curr].path ?
            prev.concat(new Promise(async(resolve, reject) => {
              const buffer = sharp(files[curr].path);
              const metadata = await buffer.metadata();
              const width = metadata.width > metadata.height ?
                Math.min(640, metadata.width) : null;
              const height = width ? null : Math.min(640, metadata.height);
              const image = await buffer
                .resize(width, height)
                .flatten()
                .jpeg({quality: 90});
              const data = await ctx.s3.upload(
                Object.assign({}, uploadParams, {
                  ContentType: files[curr].type,
                  Body: image,
                  Key: `${Math.random().toString(36).substr(2, 4)}-${fields.restaurant}/${files[curr].name}`
                })
              ).promise();
              const {rows: [{id: file}]} = await client.query(`
                  INSERT INTO ${defaultSchema}.image (created_by, restaurant, key, uri)
                    VALUES ($1::INTEGER, $2::INTEGER, $3::TEXT, $4::TEXT)
                  RETURNING id
                `,
                [
                  accountId,
                  fields.restaurant,
                  data.Key,
                  data.Location
                ]
              );
              resolve(file);
            })) : prev
        , []));
        ctx.body = data;
        ctx.status = 201;
      } catch (err) {
        ctx.status = err.status || 400;
      } finally {
        client.release();
      }
      return next();
    }
    ctx.status = 400;
  });
