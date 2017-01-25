/* eslint-disable import/no-commonjs */
exports.up = knex => knex.raw('ALTER TABLE email ENABLE ROW LEVEL SECURITY')
  .then(() => knex.raw('GRANT SELECT ON account TO guest'))
  .then(() => knex.raw('GRANT SELECT ON restaurant_account TO guest'))
  .then(() => knex.raw('GRANT SELECT ON restaurant TO guest'))
  .then(() => knex.raw('GRANT SELECT ON email TO authenticated_user'))
  .then(() => knex.raw(`
    CREATE POLICY access_own_email ON email
      FOR ALL TO authenticated_user
    USING (
      id = (
        SELECT account.email FROM account
          WHERE current_setting('jwt.claims.account_id')::INTEGER = account.id
      )
    )
    WITH CHECK (
      id = (
        SELECT account.email FROM account
          WHERE current_setting('jwt.claims.account_id')::INTEGER = account.id
      )
    )
  `))
  .then(() => knex.raw('ALTER TABLE account ENABLE ROW LEVEL SECURITY'))
  .then(() => knex.raw(`
    CREATE POLICY access_own_account ON account
      FOR ALL TO authenticated_user
    USING (id = current_setting('jwt.claims.account_id')::INTEGER)
    WITH CHECK (id = current_setting('jwt.claims.account_id')::INTEGER)
  `))
  .then(() => knex.raw('ALTER TABLE restaurant_account ENABLE ROW LEVEL SECURITY'))
  .then(() => knex.raw(`
    CREATE POLICY access_own_account ON restaurant_account
      FOR ALL TO authenticated_user
    USING (account = current_setting('jwt.claims.account_id')::INTEGER)
    WITH CHECK (account = current_setting('jwt.claims.account_id')::INTEGER)
  `));

exports.down = knex => knex.raw('DROP POLICY access_own_email ON email')
  .then(() => knex.raw('DROP POLICY access_own_account ON account'))
  .then(() => knex.raw('DROP POLICY access_own_account ON restaurant_account'))
  .then(() => knex.raw('REVOKE SELECT ON account FROM guest'))
  .then(() => knex.raw('REVOKE SELECT ON restaurant FROM guest'))
  .then(() => knex.raw('REVOKE SELECT ON restaurant_account FROM guest'))
  .then(() => knex.raw('REVOKE SELECT ON email FROM authenticated_user'))
  .then(() => knex.raw('ALTER TABLE restaurant_account DISABLE ROW LEVEL SECURITY'))
  .then(() => knex.raw('ALTER TABLE email DISABLE ROW LEVEL SECURITY'))
  .then(() => knex.raw('ALTER TABLE account DISABLE ROW LEVEL SECURITY'));
