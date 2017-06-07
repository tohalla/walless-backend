const {defaultSchema} = require('../db');

exports.up = knex => knex.raw('ALTER ROLE authenticated_user RENAME TO restaurant_employee')
  .then(() => knex.raw('CREATE ROLE authenticated_user NOLOGIN'))
  .then(() => knex.raw('REVOKE guest FROM restaurant_employee'))
  .then(() => knex.raw('GRANT guest TO authenticated_user'))
  .then(() => knex.raw('GRANT authenticated_user TO restaurant_employee'))
  .then(() => knex.raw(`
    CREATE POLICY access_own_account ON ${defaultSchema}.account
      FOR ALL TO authenticated_user
    USING (id = current_setting('jwt.claims.account_id')::INTEGER)
    WITH CHECK (id = current_setting('jwt.claims.account_id')::INTEGER)
  `));

exports.down = knex =>
  knex.raw(`DROP POLICY access_own_account ON ${defaultSchema}.account`)
  .then(() => knex.raw('REVOKE authenticated_user FROM restaurant_employee'))
  .then(() => knex.raw('DROP ROLE authenticated_user'))
  .then(() => knex.raw('ALTER ROLE restaurant_employee RENAME TO authenticated_user'))
  .then(() => knex.raw('GRANT guest TO authenticated_user'));
