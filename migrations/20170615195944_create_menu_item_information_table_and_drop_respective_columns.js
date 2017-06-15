const {defaultSchema} = require('../db');

exports.up = knex => knex.schema.withSchema(defaultSchema).table('menu_item', table => {
  table.dropColumn('name');
  table.dropColumn('description');
})
  .then(() => knex.schema.withSchema(defaultSchema).createTable('menu_item_information', table => {
    table
      .string('language', 5)
      .references('locale').inTable('translation.language')
      .index();
    table
      .integer('menu_item')
      .unsigned()
      .references('id').inTable(`${defaultSchema}.menu_item`)
      .onDelete('CASCADE');
    table.string('name', 255).notNullable();
    table.text('description');
    table.primary(['language', 'menu_item']);
  }))
  .then(() => knex.raw(`GRANT SELECT ON ${defaultSchema}.menu_item_information TO guest`))
  .then(() => knex.raw(`GRANT INSERT, DELETE, UPDATE ON ${defaultSchema}.menu_item_information TO restaurant_employee`))
  .then(() => knex.raw(`ALTER TABLE ${defaultSchema}.menu_item_information ENABLE ROW LEVEL SECURITY`))
  .then(() => knex.raw(`
    CREATE POLICY select_restaurant_menu_item_information ON ${defaultSchema}.menu_item_information
      FOR SELECT USING (true)
  `))
  .then(() => knex.raw(`
    CREATE POLICY insert_restaurant_menu_item_information ON ${defaultSchema}.menu_item_information
      FOR INSERT TO restaurant_employee
    WITH CHECK ((
      SELECT restaurant_role_rights.allow_insert_menu_item FROM ${defaultSchema}.restaurant_account
        JOIN ${defaultSchema}.restaurant_role_rights ON restaurant_role_rights.role = ${defaultSchema}.restaurant_account.role
        JOIN ${defaultSchema}.menu_item ON menu_item.id = menu_item_information.menu_item
        WHERE
          restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER AND
          menu_item.restaurant = restaurant_account.restaurant
    ))
  `))
  .then(() => knex.raw(`
    CREATE POLICY update_restaurant_menu_item_information ON ${defaultSchema}.menu_item_information
      FOR UPDATE TO restaurant_employee
    USING ((
      SELECT restaurant_role_rights.allow_update_menu_item FROM ${defaultSchema}.restaurant_account
        JOIN ${defaultSchema}.restaurant_role_rights ON restaurant_role_rights.role = ${defaultSchema}.restaurant_account.role
        JOIN ${defaultSchema}.menu_item ON menu_item.id = menu_item_information.menu_item
        WHERE
          restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER AND
          menu_item.restaurant = restaurant_account.restaurant
    ))
    WITH CHECK ((
      SELECT restaurant_role_rights.allow_update_menu_item FROM ${defaultSchema}.restaurant_account
        JOIN ${defaultSchema}.restaurant_role_rights ON restaurant_role_rights.role = ${defaultSchema}.restaurant_account.role
        JOIN ${defaultSchema}.menu_item ON menu_item.id = menu_item_information.menu_item
        WHERE
          restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER AND
          menu_item.restaurant = restaurant_account.restaurant
    ))
  `))
  .then(() => knex.raw(`
    CREATE POLICY delete_restaurant_menu_item_information ON ${defaultSchema}.menu_item_information
      FOR DELETE TO restaurant_employee
    USING ((
      SELECT restaurant_role_rights.allow_delete_menu_item FROM ${defaultSchema}.restaurant_account
        JOIN ${defaultSchema}.restaurant_role_rights ON restaurant_role_rights.role = ${defaultSchema}.restaurant_account.role
        JOIN ${defaultSchema}.menu_item ON menu_item.id = menu_item_information.menu_item
        WHERE
          restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER AND
          menu_item.restaurant = restaurant_account.restaurant
    ))
  `));

exports.down = knex => knex.schema.withSchema(defaultSchema).table('menu_item', table => {
  table.string('name', 255).defaultTo('').notNullable();
  table.text('description');
})
  .then(() => knex.schema.withSchema(defaultSchema).table('menu_item', table => {
    table.string('name', 255).notNullable().alter();
  }))
  .then(() => knex.schema.withSchema(defaultSchema).dropTable('menu_item_information'));
