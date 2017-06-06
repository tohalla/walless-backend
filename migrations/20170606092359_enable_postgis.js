exports.up = knex => knex.raw(`
  CREATE EXTENSION postgis;
  CREATE EXTENSION address_standardizer;
`);

exports.down = knex => knex.raw(`
  DROP EXTENSION address_standardizer;
  DROP EXTENSION postgis;
`);
