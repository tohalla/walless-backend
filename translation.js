import express from 'express';
import pg from 'pg';

import dbConfig from './db';

const pool = new pg.Pool(dbConfig.pg);

const get = (query, args) => new Promise((resolve, reject) =>
  pool.connect((err, client, done) => {
    if (err) {
      return err;
    }
    return client.query(query, args, (err, result) => {
      if (err) {
        return err;
      }
      done();
      return resolve(result.rows);
    });
  })
);

export default express()
  .get('/', async (req, res, next) => {
    res.set('Content-Type', 'application/json; charset=utf-8');
    res.send(await get('SELECT * FROM translation.language'));
    return next();
  })
  .get('/:lang', async(req, res, next) => {
    res.set('Content-Type', 'application/json; charset=utf-8');
    res.send(
      (await get(
        'SELECT translation.key, translation.translation FROM translation.language JOIN translation.translation ON translation.language = locale WHERE locale = $1::text',
        [req.params.lang]
      ))
        .reduce((prev, curr) =>
          Object.assign({}, prev, {[curr.key]: curr.translation}), {}
        )
    );
    return next();
  });
