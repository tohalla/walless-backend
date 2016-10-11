/* eslint-disable import/no-commonjs, fp/no-mutation, better/explicit-return, fp/no-nil */
exports.up = knex => knex.raw('ALTER TABLE email ENABLE ROW LEVEL SECURITY')
  .then(() => knex.raw(`
    CREATE POLICY access_own_email ON email
      FOR ALL TO authenticated_user
    USING (
      id = (
        SELECT account.email FROM account
          JOIN pg_settings ON name = 'jwt.claims.account_id' AND setting::INTEGER = account.id
      )
    )
    WITH CHECK (
      id = (
        SELECT account.email FROM account
          JOIN pg_settings ON name = 'jwt.claims.account_id' AND setting::INTEGER = account.id
      )
    )
  `));

exports.down = knex => knex.raw('DROP POLICY access_own_email ON email')
  .then(() => knex.raw('ALTER TABLE email DISABLE ROW LEVEL SECURITY'));
