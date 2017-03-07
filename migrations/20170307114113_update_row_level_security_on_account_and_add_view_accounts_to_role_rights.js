
exports.up = knex => knex.schema.table('restaurant_role_rights', table => {
  table.boolean('allow_view_users').notNullable().defaultTo(false);
  table.boolean('allow_view_user_roles').notNullable().defaultTo(false);
})
  .then(() => knex.raw('DROP POLICY access_own_account ON account'))
  .then(() => knex.raw(`
    CREATE POLICY access_accounts ON account
      FOR ALL TO authenticated_user
    USING (
      id = current_setting('jwt.claims.account_id')::INTEGER OR
      (
        SELECT allow_view_users FROM restaurant_account
          JOIN restaurant_role_rights ON
            restaurant_account.role = restaurant_role_rights.role AND
            (restaurant_role_rights.restaurant IS NULL OR restaurant_account.restaurant = restaurant_role_rights.restaurant)
        WHERE
          restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER
        ORDER BY restaurant_role_rights.restaurant NULLS LAST LIMIT 1
      )
    )
    WITH CHECK (id = current_setting('jwt.claims.account_id')::INTEGER)
  `))
  .then(() => knex.raw('GRANT SELECT, INSERT, UPDATE, DELETE ON account_role TO authenticated_user'))
  .then(() => knex.raw('ALTER TABLE account_role ENABLE ROW LEVEL SECURITY'))
  .then(() => knex.raw(`
    CREATE POLICY access_roles ON account_role
      FOR ALL TO authenticated_user
    USING (true)
    WITH CHECK (
      restaurant IS NOT NULL AND
      (
        SELECT allow_update_restaurant_roles FROM restaurant_account
          JOIN restaurant_role_rights ON restaurant_role_rights.role = restaurant_account.role
        WHERE
          restaurant_account.restaurant = account_role.restaurant AND
          restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER
        ORDER BY restaurant_role_rights.restaurant NULLS LAST LIMIT 1
      )
    )
  `))
  .then(() => knex.raw('GRANT SELECT, INSERT, UPDATE, DELETE ON restaurant_account TO authenticated_user'))
  .then(() => knex.raw(`DROP POLICY access_own_account ON restaurant_account`))
  .then(() => knex.raw(`
    CREATE POLICY access_restaurant_accounts ON restaurant_account
      FOR ALL TO authenticated_user
    USING (true)
    WITH CHECK ((
      SELECT allow_map_roles FROM restaurant_account a
        JOIN restaurant_role_rights ON restaurant_role_rights.role = a.role
      WHERE
        restaurant_account.restaurant = a.restaurant AND
        a.account = current_setting('jwt.claims.account_id')::INTEGER
      ORDER BY restaurant_role_rights.restaurant NULLS LAST LIMIT 1
    ))
  `));

exports.down = knex => knex.raw('DROP POLICY access_accounts ON account')
  .then(() => knex.raw('DROP POLICY access_roles ON account_role'))
  .then(() => knex.raw('REVOKE SELECT, INSERT, UPDATE, DELETE ON account_role FROM authenticated_user'))
  .then(() => knex.raw('ALTER TABLE account_role DISABLE ROW LEVEL SECURITY'))
  .then(() => knex.raw(`
    CREATE POLICY access_own_account ON account
      FOR ALL TO authenticated_user
    USING (id = current_setting('jwt.claims.account_id')::INTEGER)
    WITH CHECK (id = current_setting('jwt.claims.account_id')::INTEGER)
  `))
  .then(() => knex.raw(`DROP POLICY access_restaurant_accounts ON restaurant_account`))
  .then(() => knex.schema.table('restaurant_role_rights', table => {
    table.dropColumn('allow_view_users');
    table.dropColumn('allow_view_user_roles');
  }))
  .then(() => knex.raw(`
    CREATE POLICY access_own_account ON restaurant_account
      FOR ALL TO authenticated_user
    USING (account = current_setting('jwt.claims.account_id')::INTEGER)
    WITH CHECK (account = current_setting('jwt.claims.account_id')::INTEGER)
  `));
