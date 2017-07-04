/* eslint-disable import/no-commonjs */
exports.up = knex => knex.schema.createTable('file', table => {
  table.increments();
  table.timestamp('created_at').notNullable().defaultTo('now()');
  table.integer('created_by')
    .references('account.id')
    .notNullable()
    .unsigned();
  table.integer('restaurant')
    .references('restaurant.id')
    .onDelete('CASCADE')
    .unsigned();
  table.text('uri').notNullable().unique();
  table.string('key', 1024).notNullable().unique();
})
  .then(() => knex.raw('GRANT SELECT ON file TO guest'))
  .then(() => knex.raw('GRANT INSERT, DELETE ON file TO authenticated_user'))
  .then(() => knex.raw('GRANT SELECT, USAGE on file_id_seq to authenticated_user'))
  .then(() => knex.raw('ALTER TABLE file ENABLE ROW LEVEL SECURITY'))
  .then(() => knex.raw(`
    CREATE POLICY select_file ON file
      FOR SELECT USING (true)
  `))
  .then(() => knex.raw(`
    CREATE POLICY insert_file ON file
      FOR INSERT TO authenticated_user
    WITH CHECK ((
      SELECT restaurant_role_rights.allow_upload_file FROM restaurant_account
        JOIN restaurant_role_rights ON restaurant_role_rights.role = restaurant_account.role
      WHERE
        restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER AND
        file.restaurant = restaurant_account.restaurant
    ))
  `))
  .then(() => knex.raw(`
    CREATE POLICY delete_file ON file
      FOR DELETE TO authenticated_user
    USING ((
      SELECT restaurant_role_rights.allow_delete_file FROM restaurant_account
        JOIN restaurant_role_rights ON restaurant_role_rights.role = restaurant_account.role
      WHERE
        restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER AND
        file.restaurant = restaurant_account.restaurant
    ))
  `))
  .then(() => knex.schema.createTable('menu_item_file', table => {
      table.integer('menu_item')
        .references('menu_item.id')
        .onDelete('CASCADE')
        .unsigned()
        .index()
        .notNullable();
      table.integer('file')
        .references('file.id')
        .onDelete('CASCADE')
        .index()
        .unsigned()
        .notNullable();
      table.primary(['menu_item', 'file']);
  }))
  .then(() => knex.raw('GRANT SELECT ON menu_item_file TO guest'))
  .then(() => knex.raw('GRANT INSERT, DELETE ON menu_item_file TO authenticated_user'))
  .then(() => knex.raw('ALTER TABLE menu_item_file ENABLE ROW LEVEL SECURITY'))
  .then(() => knex.raw(`
    CREATE POLICY select_menu_item_file ON menu_item_file
      FOR SELECT USING (true)
  `))
  .then(() => knex.raw(`
    CREATE POLICY insert_menu_item_file ON menu_item_file
      FOR INSERT TO authenticated_user
    WITH CHECK ((
      SELECT restaurant_role_rights.allow_upload_file FROM restaurant_account
        JOIN file ON file.id = menu_item_file.file AND file.restaurant = restaurant_account.restaurant
        JOIN restaurant_role_rights ON restaurant_role_rights.role = restaurant_account.role
      WHERE
        restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER
    ))
  `))
  .then(() => knex.raw(`
    CREATE POLICY delete_menu_item_file ON menu_item_file
      FOR DELETE TO authenticated_user
    USING ((
      SELECT restaurant_role_rights.allow_delete_file FROM restaurant_account
        JOIN file ON file.id = menu_item_file.file AND file.restaurant = restaurant_account.restaurant
        JOIN restaurant_role_rights ON restaurant_role_rights.role = restaurant_account.role
      WHERE
        restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER
    ))
  `));

exports.down = knex => knex.schema.dropTable('menu_item_file')
  .then(() => knex.schema.dropTable('file'));
