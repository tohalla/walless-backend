import Router from 'koa-router';
import config from 'config';
import koaBody from 'koa-body';
import {template, times} from 'lodash/fp';
import qr from 'qrcode';
import pdf from 'html-pdf';

import {defaultSchema} from './db';
import jwt from 'jsonwebtoken';
import pool from './pool';

const jwtSecret = config.get('jwtSecret');

const isValid = async(servingLocationId, key, client) => {
  if (!servingLocationId && !key) {
    return false;
  }
  const {rows: [{exists}]} = await (client || pool).query(`
      SELECT EXISTS(
        SELECT FROM ${defaultSchema}.serving_location
        WHERE serving_location.id = $1::INTEGER AND serving_location.key = $2::TEXT
      )
    `,
    [servingLocationId, key]
  );
  return exists;
};
export default new Router({prefix: 'serving-location'})
  .post('/', koaBody(), async(ctx, next) => {
    const {header: {authorization}, request: {body: {code}}} = ctx;
    const {account_id: accountId} = authorization ? await jwt.verify(
      authorization.replace('Bearer ', ''),
      jwtSecret
    ) : {};
    const {servingLocationId, key} = JSON.parse(new Buffer(code, 'base64').toString('ascii'));
    const client = await pool.connect();
    if (isValid(servingLocationId, key, client) && accountId) {
      try {
        await client.query(
          `DELETE FROM ${defaultSchema}.serving_location_account WHERE account=$1::INTEGER`,
          [accountId]
        );
        const {rows: [{serving_location: servingLocation, restaurant}]} = await client.query(`
          INSERT INTO ${defaultSchema}.serving_location_account (serving_location, account) VALUES
          ($1::INTEGER, $2::INTEGER) RETURNING
          serving_location,
          (SELECT restaurant FROM ${defaultSchema}.serving_location WHERE id=$1::INTEGER) AS restaurant`,
          [servingLocationId, accountId]
        );
        ctx.body = {servingLocation, restaurant};
        ctx.status = 201;
      } catch (error) {
        ctx.status = error.status || 400;
      } finally {
        client.release();
      }
    } else {
      ctx.status = 400;
    }
  })
  .delete('/', koaBody(), async(ctx, next) => {
    const {header: {authorization}} = ctx;
    const {account_id: accountId} = authorization ? await jwt.verify(
      authorization.replace('Bearer ', ''),
      jwtSecret
    ) : {};
    const client = await pool.connect();
    if (accountId) {
      try {
        await client.query(
          `DELETE FROM ${defaultSchema}.serving_location_account WHERE account=$1::INTEGER`,
          [accountId]
        );
        ctx.status = 200;
      } catch (error) {
        ctx.status = error.status || 400;
      } finally {
        client.release();
      }
    } else {
      ctx.status = 400;
    }
  })
  .get('/restaurant/:restaurant', async(ctx, next) => {
    const {params: {restaurant}, query = {servingLocations: []}} = ctx;
    const requestedServingLocations = JSON.parse(query.servingLocations);
    const client = await pool.connect();
    const {header: {authorization}} = ctx;
    try {
      if (!authorization) {
        ctx.throw(401);
      } else if (!Array.isArray(requestedServingLocations)) {
        ctx.throw(400);
      }
      const {account_id: accountId} = await jwt.verify(
        authorization.replace('Bearer ', ''),
        jwtSecret
      );
      const {rows: [{allow_download_qr_codes: allowDownloadQR}]}= await client.query(`
          SELECT allow_download_qr_codes FROM ${defaultSchema}.restaurant_account
            JOIN ${defaultSchema}.restaurant_role_rights ON restaurant_role_rights.id = restaurant_account.role
          WHERE restaurant_account.restaurant = $2::INTEGER AND account = $1::INTEGER
        `,
        [accountId, restaurant]
      );
      if (!allowDownloadQR) {
        ctx.throw(401);
      }
      const {rows: servingLocations} = await client.query(
        `SELECT id, key FROM ${defaultSchema}.serving_location WHERE
          restaurant=$1::integer AND
          id IN (${times(i => `$${2 + i}`)(requestedServingLocations.length).join(',')})
        `,
        [restaurant, ...requestedServingLocations]
      );
      const codes = await Promise.all(
        servingLocations.map(location => new Promise((resolve, reject) =>
          qr.toString('walless://serving-location/' + new Buffer(JSON.stringify({
            servingLocationId: location.id,
            key: location.key
          })).toString('base64'),
          {errorCorrectionLevel: 'Q', type: 'svg', scale: 3},
        (error, string) => error ? reject(error) : resolve(string)
        )))
      );
      const html = template(`
        <% _.forEach(function(code) { %>
          <div style="display: inline-block"><%= code %></div>
        <% })(codes) %>
      `)({codes});
      const doc = await new Promise((resolve, reject) =>
        pdf.create(html).toBuffer((err, buffer) =>
          err ? reject(err) : resolve(buffer)
        )
      );
      ctx.body = doc;
      ctx.type = 'application/pdf';
      ctx.response.set('Content-Disposition', 'attachment;filename="qr.pdf"');
    } catch (error) {
      ctx.status = error.status || 400;
    } finally {
      client.release();
    }
  })
  .get('/:code', async(ctx, next) => {
    const {params: {code}} = ctx;
    const {servingLocationId, key} = JSON.parse(new Buffer(code, 'base64').toString('ascii'));
    if (servingLocationId && key) {
      try {
        if (!isValid(servingLocationId, key)) {
          throw Error({status: 400});
        }
        ctx.body = code;
      } catch (error) {
        ctx.status = error.status || 400;
      }
    } else {
      ctx.status = 400;
    }
  });
