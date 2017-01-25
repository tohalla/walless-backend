/* eslint-disable import/no-commonjs */
exports.up = knex => knex.schema.createTable('serving_location', table => {
  table.increments(); // id
  table.timestamp('created_at').notNullable().defaultTo('now()');
  table.timestamp('updated_at');
  table.string('name', 255).notNullable().comment('Name field');
  table.boolean('enabled').notNullable().defaultTo(true);
  table.integer('restaurant')
    .references('restaurant.id')
    .onDelete('CASCADE')
    .notNullable()
    .index()
    .unsigned();
})
  .then(() => knex.schema.table('restaurant_role_rights', table => {
    table.boolean('allow_insert_serving_location').notNullable().defaultTo(false);
    table.boolean('allow_update_serving_location').notNullable().defaultTo(false);
    table.boolean('allow_delete_serving_location').notNullable().defaultTo(false);
  }))
  .then(() => knex.raw('GRANT INSERT, DELETE, UPDATE ON serving_location TO authenticated_user'))
  .then(() => knex.raw('GRANT SELECT ON serving_location TO guest'))
  .then(() => knex.raw('GRANT SELECT, USAGE on serving_location_id_seq to authenticated_user'))
  .then(() => knex.raw('ALTER TABLE serving_location ENABLE ROW LEVEL SECURITY'))
  .then(() => knex.raw(`
    CREATE POLICY select_serving_location ON serving_location
      FOR SELECT USING (true)
  `))
  .then(() => knex.raw(`
    CREATE POLICY insert_serving_location ON serving_location
      FOR INSERT TO authenticated_user
    WITH CHECK ((
      SELECT restaurant_role_rights.allow_insert_serving_location FROM restaurant_account
        JOIN restaurant_role_rights ON restaurant_role_rights.role = restaurant_account.role
        WHERE
          restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER AND
          serving_location.restaurant = restaurant_account.restaurant AND
          serving_location.restaurant IS NOT NULL
    ))
  `))
  .then(() => knex.raw(`
    CREATE POLICY update_serving_location ON serving_location
      FOR UPDATE TO authenticated_user
    USING ((
      SELECT restaurant_role_rights.allow_update_serving_location FROM restaurant_account
        JOIN restaurant_role_rights ON restaurant_role_rights.role = restaurant_account.role
        WHERE
          restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER AND
          serving_location.restaurant = restaurant_account.restaurant AND
          serving_location.restaurant IS NOT NULL
    ))
    WITH CHECK ((
      SELECT restaurant_role_rights.allow_update_serving_location FROM restaurant_account
        JOIN restaurant_role_rights ON restaurant_role_rights.role = restaurant_account.role
        WHERE
          restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER AND
          serving_location.restaurant = restaurant_account.restaurant AND
          serving_location.restaurant IS NOT NULL
    ))
  `))
  .then(() => knex.raw(`
    CREATE POLICY delete_serving_location ON serving_location
      FOR DELETE TO authenticated_user
    USING ((
      SELECT restaurant_role_rights.allow_delete_serving_location FROM restaurant_account
        JOIN restaurant_role_rights ON restaurant_role_rights.role = restaurant_account.role
        WHERE
          restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER AND
          serving_location.restaurant = restaurant_account.restaurant AND
          serving_location.restaurant IS NOT NULL
    ))
  `));

exports.down = knex => knex.schema.dropTable('serving_location')
  .then(knex.schema.table('restaurant_role_rights', table => {
    table.dropColumn('allow_insert_promotion');
    table.dropColumn('allow_update_promotion');
    table.dropColumn('allow_delete_promotion');
  }));
