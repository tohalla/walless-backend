const {defaultSchema} = require('../db');

exports.up = knex => knex.schema.withSchema(defaultSchema).createTable('restaurant_language', table => {
  table
    .string('language', 5)
    .references('locale').inTable('translation.language')
    .onDelete('CASCADE')
    .index();
  table
    .integer('restaurant')
    .unsigned()
    .references('id').inTable(`${defaultSchema}.restaurant`)
    .onDelete('CASCADE');
  table.boolean('spoken').notNullable().defaultTo(false);
  table.primary(['language', 'restaurant']);
})
  .then(() => knex.raw(`GRANT SELECT ON ${defaultSchema}.restaurant_language TO guest`))
  .then(() => knex.raw(`GRANT INSERT, DELETE, UPDATE ON ${defaultSchema}.restaurant_language TO restaurant_employee`))
  .then(() => knex.raw(`ALTER TABLE ${defaultSchema}.restaurant_language ENABLE ROW LEVEL SECURITY`))
  .then(() => knex.raw(`
    CREATE POLICY select_restaurant_language ON ${defaultSchema}.restaurant_language
      FOR SELECT USING (true)
  `))
  .then(() => knex.raw(`
    CREATE POLICY insert_restaurant_language ON ${defaultSchema}.restaurant_language
      FOR INSERT TO restaurant_employee
    WITH CHECK ((
      SELECT restaurant_role_rights.allow_update_restaurant FROM ${defaultSchema}.restaurant_account
        JOIN ${defaultSchema}.restaurant_role_rights ON restaurant_role_rights.role = ${defaultSchema}.restaurant_account.role
        WHERE
          restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER AND
          restaurant_language.restaurant = restaurant_account.restaurant
    ))
  `))
  .then(() => knex.raw(`
    CREATE POLICY update_restaurant_language ON ${defaultSchema}.restaurant_language
      FOR UPDATE TO restaurant_employee
    USING ((
      SELECT restaurant_role_rights.allow_update_restaurant FROM ${defaultSchema}.restaurant_account
        JOIN ${defaultSchema}.restaurant_role_rights ON restaurant_role_rights.role = ${defaultSchema}.restaurant_account.role
        WHERE
          restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER AND
          restaurant_language.restaurant = restaurant_account.restaurant
    ))
    WITH CHECK ((
      SELECT restaurant_role_rights.allow_update_restaurant FROM ${defaultSchema}.restaurant_account
        JOIN ${defaultSchema}.restaurant_role_rights ON restaurant_role_rights.role = ${defaultSchema}.restaurant_account.role
        WHERE
          restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER AND
          restaurant_language.restaurant = restaurant_account.restaurant
    ))
  `))
  .then(() => knex.raw(`
    CREATE POLICY delete_restaurant_language ON ${defaultSchema}.restaurant_language
      FOR DELETE TO restaurant_employee
    USING ((
      SELECT restaurant_role_rights.allow_update_restaurant FROM ${defaultSchema}.restaurant_account
        JOIN ${defaultSchema}.restaurant_role_rights ON restaurant_role_rights.role = ${defaultSchema}.restaurant_account.role
        WHERE
          restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER AND
          restaurant_language.restaurant = restaurant_account.restaurant
    ))
  `));

exports.down = knex => knex.schema.withSchema(defaultSchema).dropTable('restaurant_language');
