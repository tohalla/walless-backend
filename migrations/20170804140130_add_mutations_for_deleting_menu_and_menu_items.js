const {defaultSchema} = require('../db');

exports.up = knex => knex.raw(`
    CREATE OR REPLACE FUNCTION ${defaultSchema}.delete_menu_item(menu_item INTEGER) RETURNS VOID
    AS $$
      DELETE FROM ${defaultSchema}.menu_item WHERE delete_menu_item.menu_item = menu_item.id
    $$ LANGUAGE sql
  `)
  .then(() => knex.raw(`
    CREATE OR REPLACE FUNCTION ${defaultSchema}.delete_menu(menu INTEGER) RETURNS VOID
    AS $$
      DELETE FROM ${defaultSchema}.menu WHERE delete_menu.menu = menu.id
    $$ LANGUAGE sql
  `))
  .then(() => knex.raw(`GRANT DELETE ON ${defaultSchema}.menu_item TO restaurant_employee`))
  .then(() => knex.raw(`GRANT DELETE ON ${defaultSchema}.menu TO restaurant_employee`))
  .then(() => knex.raw(`
    CREATE POLICY delete_menu ON ${defaultSchema}.menu
      FOR DELETE TO restaurant_employee
    USING ((
      SELECT restaurant_role_rights.allow_delete_menu FROM ${defaultSchema}.restaurant_account
        JOIN ${defaultSchema}.restaurant_role_rights ON restaurant_role_rights.role = restaurant_account.role
      WHERE
        menu.restaurant = restaurant_account.restaurant AND restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER
    ))
  `))
  .then(() => knex.raw(`
    CREATE POLICY delete_menu_item ON ${defaultSchema}.menu_item
      FOR DELETE TO restaurant_employee
    USING ((
      SELECT restaurant_role_rights.allow_delete_menu_item FROM ${defaultSchema}.restaurant_account
        JOIN ${defaultSchema}.restaurant_role_rights ON restaurant_role_rights.role = restaurant_account.role
      WHERE
        menu_item.restaurant = restaurant_account.restaurant AND restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER
    ))
  `));

exports.down = knex => knex.raw(`DROP FUNCTION ${defaultSchema}.delete_menu(INTEGER)`)
  .then(() => knex.raw(`DROP FUNCTION ${defaultSchema}.delete_menu_item(INTEGER)`))
  .then(() => knex.raw(`DROP POLICY delete_menu ON ${defaultSchema}.menu`))
  .then(() => knex.raw(`DROP POLICY delete_menu_item ON ${defaultSchema}.menu_item`))
  .then(() => knex.raw(`REVOKE DELETE ON ${defaultSchema}.menu_item FROM restaurant_employee`))
  .then(() => knex.raw(`REVOKE DELETE ON ${defaultSchema}.menu FROM restaurant_employee`));
