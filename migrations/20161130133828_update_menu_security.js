/* eslint-disable import/no-commonjs */
exports.up = knex =>
  knex.raw('GRANT SELECT ON menu TO guest')
  .then(() => knex.raw('GRANT INSERT, DELETE, UPDATE ON menu TO authenticated_user'))
  .then(() => knex.raw('GRANT SELECT, USAGE on menu_id_seq to authenticated_user'))
  .then(() => knex.raw('ALTER TABLE menu ENABLE ROW LEVEL SECURITY'))
  .then(() => knex.raw(`
    CREATE POLICY select_restaurant_menu ON menu
      FOR SELECT USING (true)
  `))
  .then(() => knex.raw(`
    CREATE POLICY insert_restaurant_menu ON menu
      FOR INSERT TO authenticated_user
    WITH CHECK ((
      SELECT restaurant_role_rights.allow_insert_menu FROM restaurant_account
        JOIN restaurant_role_rights ON restaurant_role_rights.role = restaurant_account.role
        WHERE
          restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER AND
          menu.restaurant = restaurant_account.restaurant
    ))
  `))
  .then(() => knex.raw(`
    CREATE POLICY update_restaurant_menu ON menu
      FOR UPDATE TO authenticated_user
    USING ((
      SELECT restaurant_role_rights.allow_update_menu FROM restaurant_account
        JOIN restaurant_role_rights ON restaurant_role_rights.role = restaurant_account.role
        WHERE
          restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER AND
          menu.restaurant = restaurant_account.restaurant
    ))
    WITH CHECK ((
      SELECT restaurant_role_rights.allow_update_menu FROM restaurant_account
        JOIN restaurant_role_rights ON restaurant_role_rights.role = restaurant_account.role
        WHERE
          restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER AND
          menu.restaurant = restaurant_account.restaurant
    ))
  `))
  .then(() => knex.raw(`
    CREATE POLICY delete_restaurant_menu ON menu
      FOR DELETE TO authenticated_user
    USING ((
      SELECT restaurant_role_rights.allow_delete_menu FROM restaurant_account
        JOIN restaurant_role_rights ON restaurant_role_rights.role = restaurant_account.role
        WHERE
          restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER AND
          menu.restaurant = restaurant_account.restaurant
    ))
  `));

exports.down = knex => knex.raw('DROP POLICY select_restaurant_menu ON menu')
  .then(() => knex.raw('DROP POLICY insert_restaurant_menu ON menu'))
  .then(() => knex.raw('DROP POLICY update_restaurant_menu ON menu'))
  .then(() => knex.raw('DROP POLICY delete_restaurant_menu ON menu'))
  .then(() => knex.raw('REVOKE SELECT ON menu FROM guest'))
  .then(() => knex.raw('ALTER TABLE menu DISABLE ROW LEVEL SECURITY'));
