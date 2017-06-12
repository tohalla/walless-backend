const {defaultSchema} = require('../db');

exports.up = knex => knex.raw(`
  CREATE OR REPLACE FUNCTION ${defaultSchema}.get_active_account() RETURNS ${defaultSchema}.account
  AS $$
    SELECT *  FROM ${defaultSchema}.account
      WHERE  ${defaultSchema}.account.id = NULLIF(current_setting('jwt.claims.account_id', true), '')::INTEGER;
  $$ LANGUAGE sql STABLE
`);

exports.down = knex => knex.raw(`
  CREATE OR REPLACE FUNCTION ${defaultSchema}.get_active_account() RETURNS ${defaultSchema}.account
  AS $$
    SELECT * FROM ${defaultSchema}.account
      WHERE account.id = current_setting('jwt.claims.account_id')::INTEGER
  $$ LANGUAGE sql stable
`);

