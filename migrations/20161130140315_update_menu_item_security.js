/* eslint-disable import/no-commonjs */
exports.up = knex =>
  knex.raw('GRANT SELECT ON menu_item TO guest')
  .then(() => knex.raw('GRANT INSERT, DELETE, UPDATE ON menu_item TO authenticated_user'))
  .then(() => knex.raw('GRANT INSERT, DELETE ON menu_menu_item TO authenticated_user'))
  .then(() => knex.raw('GRANT SELECT ON menu_menu_item TO guest'))
  .then(() => knex.raw('GRANT SELECT, USAGE on menu_item_id_seq to authenticated_user'))
  .then(() => knex.raw('ALTER TABLE menu_item ENABLE ROW LEVEL SECURITY'))
  .then(() => knex.raw('ALTER TABLE menu_menu_item ENABLE ROW LEVEL SECURITY'))
  .then(() => knex.raw(`
    CREATE POLICY select_restaurant_menu_item ON menu_item
      FOR SELECT USING (true)
  `))
  .then(() => knex.raw(`
    CREATE POLICY insert_restaurant_menu_item ON menu_item
      FOR INSERT TO authenticated_user
    WITH CHECK ((
      SELECT restaurant_role_rights.allow_insert_menu_item FROM restaurant_account
        JOIN restaurant_role_rights ON restaurant_role_rights.role = restaurant_account.role
        WHERE
          restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER AND
          menu_item.restaurant = restaurant_account.restaurant AND
          menu_item.restaurant IS NOT NULL
    ))
  `))
  .then(() => knex.raw(`
    CREATE POLICY update_restaurant_menu_item ON menu_item
      FOR UPDATE TO authenticated_user
    USING ((
      SELECT restaurant_role_rights.allow_update_menu_item FROM restaurant_account
        JOIN restaurant_role_rights ON restaurant_role_rights.role = restaurant_account.role
        WHERE
          restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER AND
          menu_item.restaurant = restaurant_account.restaurant AND
          menu_item.restaurant IS NOT NULL
    ))
    WITH CHECK ((
      SELECT restaurant_role_rights.allow_update_menu_item FROM restaurant_account
        JOIN restaurant_role_rights ON restaurant_role_rights.role = restaurant_account.role
        WHERE
          restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER AND
          menu_item.restaurant = restaurant_account.restaurant AND
          menu_item.restaurant IS NOT NULL
    ))
  `))
  .then(() => knex.raw(`
    CREATE POLICY delete_restaurant_menu_item ON menu_item
      FOR DELETE TO authenticated_user
    USING ((
      SELECT restaurant_role_rights.allow_delete_menu_item FROM restaurant_account
        JOIN restaurant_role_rights ON restaurant_role_rights.role = restaurant_account.role
        WHERE
          restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER AND
          menu_item.restaurant = restaurant_account.restaurant AND
          menu_item.restaurant IS NOT NULL
    ))
  `))
  .then(() => knex.raw(`
    CREATE POLICY update_menu_items ON menu_menu_item
      FOR ALL TO authenticated_user
    USING ((
      SELECT restaurant_role_rights.allow_update_menu FROM restaurant_account
        JOIN restaurant_role_rights ON restaurant_role_rights.role = restaurant_account.role
        JOIN menu ON menu.id = menu_menu_item.menu
        JOIN menu_item ON menu_item.id = menu_menu_item.menu_item
        WHERE
          restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER AND
          menu.restaurant = restaurant_account.restaurant AND
          (menu_item.restaurant = restaurant_account.restaurant OR menu_item.restaurant IS NULL) AND
          menu.restaurant IS NOT NULL
    ))
    WITH CHECK ((
      SELECT restaurant_role_rights.allow_update_menu FROM restaurant_account
        JOIN restaurant_role_rights ON restaurant_role_rights.role = restaurant_account.role
        JOIN menu ON menu.id = menu_menu_item.menu
        JOIN menu_item ON menu_item.id = menu_menu_item.menu_item
        WHERE
          restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER AND
          menu.restaurant = restaurant_account.restaurant AND
          (menu_item.restaurant = restaurant_account.restaurant OR menu_item.restaurant IS NULL) AND
          menu.restaurant IS NOT NULL
    ))
  `));

exports.down = knex => knex.raw('DROP POLICY select_restaurant_menu_item ON menu_item')
  .then(() => knex.raw('DROP POLICY insert_restaurant_menu_item ON menu_item'))
  .then(() => knex.raw('DROP POLICY update_restaurant_menu_item ON menu_item'))
  .then(() => knex.raw('DROP POLICY delete_restaurant_menu_item ON menu_item'))
  .then(() => knex.raw('DROP POLICY update_menu_items ON menu_menu_item'))
  .then(() => knex.raw('REVOKE SELECT ON menu_item FROM guest'))
  .then(() => knex.raw('REVOKE SELECT ON menu_menu_item FROM guest'))
  .then(() => knex.raw('REVOKE INSERT, DELETE, UPDATE ON menu_item FROM authenticated_user'))
  .then(() => knex.raw('REVOKE INSERT, DELETE, UPDATE ON menu_menu_item FROM authenticated_user'))
  .then(() => knex.raw('ALTER TABLE menu_item DISABLE ROW LEVEL SECURITY'))
  .then(() => knex.raw('ALTER TABLE menu_menu_item DISABLE ROW LEVEL SECURITY'))
  .then(() => knex.raw('REVOKE SELECT, USAGE on menu_item_id_seq FROM authenticated_user'));
