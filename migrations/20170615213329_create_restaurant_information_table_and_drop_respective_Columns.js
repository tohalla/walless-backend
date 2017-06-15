const {defaultSchema} = require('../db');

exports.up = knex => knex.schema.withSchema(defaultSchema).table('restaurant', table => {
  table.dropColumn('name');
  table.dropColumn('description');
})
  .then(() => knex.schema.withSchema(defaultSchema).createTable('restaurant_information', table => {
    table
      .string('language', 5)
      .references('locale').inTable('translation.language')
      .index();
    table
      .integer('restaurant')
      .unsigned()
      .references('id').inTable(`${defaultSchema}.restaurant`)
      .onDelete('CASCADE');
    table.string('name', 255).notNullable();
    table.text('description');
    table.primary(['language', 'restaurant']);
  }))
  .then(() => knex.raw(`GRANT SELECT ON ${defaultSchema}.restaurant_information TO guest`))
  .then(() => knex.raw(`GRANT INSERT, DELETE, UPDATE ON ${defaultSchema}.restaurant_information TO restaurant_employee`))
  .then(() => knex.raw(`ALTER TABLE ${defaultSchema}.restaurant_information ENABLE ROW LEVEL SECURITY`))
  .then(() => knex.raw(`
    CREATE POLICY select_restaurant_restaurant_information ON ${defaultSchema}.restaurant_information
      FOR SELECT USING (true)
  `))
  .then(() => knex.raw(`
    CREATE POLICY insert_restaurant_restaurant_information ON ${defaultSchema}.restaurant_information
      FOR INSERT TO restaurant_employee
    WITH CHECK ((
      SELECT restaurant_role_rights.allow_update_restaurant FROM ${defaultSchema}.restaurant_account
        JOIN ${defaultSchema}.restaurant_role_rights ON restaurant_role_rights.role = ${defaultSchema}.restaurant_account.role
        WHERE
          restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER AND
          restaurant_information.restaurant = restaurant_account.restaurant
    ))
  `))
  .then(() => knex.raw(`
    CREATE POLICY update_restaurant_restaurant_information ON ${defaultSchema}.restaurant_information
      FOR UPDATE TO restaurant_employee
    USING ((
      SELECT restaurant_role_rights.allow_update_restaurant FROM ${defaultSchema}.restaurant_account
        JOIN ${defaultSchema}.restaurant_role_rights ON restaurant_role_rights.role = ${defaultSchema}.restaurant_account.role
        WHERE
          restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER AND
          restaurant_information.restaurant = restaurant_account.restaurant
    ))
    WITH CHECK ((
      SELECT restaurant_role_rights.allow_update_restaurant FROM ${defaultSchema}.restaurant_account
        JOIN ${defaultSchema}.restaurant_role_rights ON restaurant_role_rights.role = ${defaultSchema}.restaurant_account.role
        WHERE
          restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER AND
          restaurant_information.restaurant = restaurant_account.restaurant
    ))
  `))
  .then(() => knex.raw(`
    CREATE POLICY delete_restaurant_restaurant_information ON ${defaultSchema}.restaurant_information
      FOR DELETE TO restaurant_employee
    USING ((
      SELECT restaurant_role_rights.allow_update_restaurant FROM ${defaultSchema}.restaurant_account
        JOIN ${defaultSchema}.restaurant_role_rights ON restaurant_role_rights.role = ${defaultSchema}.restaurant_account.role
        WHERE
          restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER AND
          restaurant_information.restaurant = restaurant_account.restaurant
    ))
  `));

exports.down = knex => knex.schema.withSchema(defaultSchema).table('restaurant', table => {
  table.string('name', 255).defaultTo('').notNullable();
  table.text('description');
})
  .then(() => knex.schema.withSchema(defaultSchema).table('restaurant', table => {
    table.string('name', 255).notNullable().alter();
  }))
  .then(() => knex.schema.withSchema(defaultSchema).dropTable('restaurant_information'));
