import pg from 'pg';

import dbConfig from '../db';

const pool = new pg.Pool(dbConfig.pg);

const query = (query, args) => new Promise((resolve, reject) =>
  pool.connect((err, client, done) => {
    if (err) {
      return reject(err);
    }
    return client.query(query, args, (err, result) => {
      if (err) {
        return reject(err);
      }
      done();
      return resolve(result.rows);
    });
  })
);

export {
  query
};
