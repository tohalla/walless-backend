const {defaultSchema} = require('../db');

exports.up = knex => knex.raw(`DROP POLICY select_file ON ${defaultSchema}.file`)
  .then(() => knex.raw(`DROP POLICY select_restaurant_file ON ${defaultSchema}.restaurant_file`))
  .then(() => knex.raw(`REVOKE SELECT ON ${defaultSchema}.restaurant_file FROM guest`))
  .then(() => knex.raw(`REVOKE SELECT ON ${defaultSchema}.file FROM guest`))
  .then(() => knex.raw(`DROP FUNCTION ${defaultSchema}.update_menu_item_files(INTEGER, INTEGER[])`))
  .then(() => knex.raw(`DROP FUNCTION ${defaultSchema}.update_restaurant_files(INTEGER, INTEGER[])`))
  .then(() => knex.schema.withSchema(defaultSchema).dropTable('menu_item_file'));

exports.down = knex => knex.raw(`CREATE POLICY select_file ON ${defaultSchema}.file FOR SELECT USING (true)`)
  .then(() => knex.schema.withSchema(defaultSchema).createTable('menu_item_file', table => {
      table.integer('menu_item')
        .references('id').inTable(`${defaultSchema}.menu_item`)
        .onDelete('CASCADE')
        .unsigned()
        .index()
        .notNullable();
      table.integer('file')
        .references('id').inTable(`${defaultSchema}.file`)
        .onDelete('CASCADE')
        .index()
        .unsigned()
        .notNullable();
      table.primary(['menu_item', 'file']);
  }))
  .then(() => knex.raw(`GRANT SELECT ON ${defaultSchema}.menu_item_file TO guest`))
  .then(() => knex.raw(`GRANT SELECT ON ${defaultSchema}.file TO guest`))
  .then(() => knex.raw(`GRANT INSERT, DELETE ON ${defaultSchema}.menu_item_file TO restaurant_employee`))
  .then(() => knex.raw(`ALTER TABLE ${defaultSchema}.menu_item_file ENABLE ROW LEVEL SECURITY`))
  .then(() => knex.raw(`
    CREATE POLICY select_menu_item_file ON ${defaultSchema}.menu_item_file
      FOR SELECT USING (true)
  `))
  .then(() => knex.raw(`
    CREATE POLICY insert_menu_item_file ON ${defaultSchema}.menu_item_file
      FOR INSERT TO restaurant_employee
    WITH CHECK ((
      SELECT restaurant_role_rights.allow_upload_file FROM ${defaultSchema}.restaurant_account
        JOIN ${defaultSchema}.file ON file.id = menu_item_file.file AND file.restaurant = restaurant_account.restaurant
        JOIN ${defaultSchema}.restaurant_role_rights ON restaurant_role_rights.role = restaurant_account.role
      WHERE
        restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER
    ))
  `))
  .then(() => knex.raw(`
    CREATE POLICY delete_menu_item_file ON ${defaultSchema}.menu_item_file
      FOR DELETE TO restaurant_employee
    USING ((
      SELECT restaurant_role_rights.allow_delete_file FROM ${defaultSchema}.restaurant_account
        JOIN ${defaultSchema}.file ON file.id = menu_item_file.file AND file.restaurant = restaurant_account.restaurant
        JOIN ${defaultSchema}.restaurant_role_rights ON restaurant_role_rights.role = restaurant_account.role
      WHERE
        restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER
    ))
  `))
  .then(() => knex.raw(`GRANT SELECT ON ${defaultSchema}.restaurant_file TO guest`))
  .then(() => knex.raw(`ALTER TABLE ${defaultSchema}.restaurant_file ENABLE ROW LEVEL SECURITY`))
  .then(() => knex.raw(`
    CREATE POLICY select_restaurant_file ON ${defaultSchema}.restaurant_file
      FOR SELECT USING (true)
  `))
  .then(() => knex.raw(`
    CREATE OR REPLACE FUNCTION ${defaultSchema}.update_restaurant_files(restaurant INTEGER, files INTEGER[]) RETURNS SETOF ${defaultSchema}.restaurant_file
    AS $$
      DECLARE r record;
      BEGIN
        DELETE FROM ${defaultSchema}.restaurant_file WHERE restaurant_file.restaurant = update_restaurant_files.restaurant;
        INSERT INTO ${defaultSchema}.restaurant_file (restaurant, file) SELECT update_restaurant_files.restaurant AS restaurant, file FROM UNNEST(update_restaurant_files.files) AS file;
        FOR r IN SELECT * FROM ${defaultSchema}.restaurant_file WHERE restaurant_file.restaurant = update_restaurant_files.restaurant
        LOOP
          RETURN next r;
        END LOOP;
      END;
    $$ LANGUAGE plpgsql
  `))
  .then(() => knex.raw(`GRANT EXECUTE ON FUNCTION ${defaultSchema}.update_restaurant_files(INTEGER, INTEGER[]) TO restaurant_employee`))
  .then(() => knex.raw(`
    CREATE OR REPLACE FUNCTION ${defaultSchema}.update_menu_item_files(menu_item INTEGER, files INTEGER[]) RETURNS SETOF ${defaultSchema}.menu_item_file
    AS $$
      DECLARE r record;
      BEGIN
        DELETE FROM ${defaultSchema}.menu_item_file WHERE menu_item_file.menu_item = update_menu_item_files.menu_item;
        INSERT INTO ${defaultSchema}.menu_item_file (menu_item, file) SELECT update_menu_item_files.menu_item AS menu_item, file FROM UNNEST(update_menu_item_files.files) AS file;
        FOR r IN SELECT * FROM ${defaultSchema}.menu_item_file WHERE menu_item_file.menu_item = update_menu_item_files.menu_item
        LOOP
          RETURN next r;
        END LOOP;
      END;
    $$ LANGUAGE plpgsql
  `))
  .then(() => knex.raw(`GRANT EXECUTE ON FUNCTION ${defaultSchema}.update_menu_item_files(INTEGER, INTEGER[]) TO restaurant_employee`));
