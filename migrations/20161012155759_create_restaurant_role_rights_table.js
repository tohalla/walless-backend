/* eslint-disable import/no-commonjs */
exports.up = knex =>
  knex.schema.createTable('restaurant_role_rights', table => {
    table.increments();
    table.integer('role')
      .references('account_role.id')
      .onDelete('CASCADE')
      .index()
      .unsigned();
    table.integer('restaurant')
      .references('restaurant.id')
      .onDelete('CASCADE')
      .unsigned();
    table.boolean('allow_insert_promotion').notNullable().defaultTo(false);
    table.boolean('allow_update_promotion').notNullable().defaultTo(false);
    table.boolean('allow_delete_promotion').notNullable().defaultTo(false);
    table.boolean('allow_insert_menu').notNullable().defaultTo(false);
    table.boolean('allow_update_menu').notNullable().defaultTo(false);
    table.boolean('allow_delete_menu').notNullable().defaultTo(false);
    table.boolean('allow_insert_menu_item').notNullable().defaultTo(false);
    table.boolean('allow_update_menu_item').notNullable().defaultTo(false);
    table.boolean('allow_delete_menu_item').notNullable().defaultTo(false);
    table.boolean('allow_change_restaurant_description').notNullable().defaultTo(false);
    table.boolean('allow_change_restaurant_name').notNullable().defaultTo(false);
    table.boolean('allow_update_restaurant_roles').notNullable().defaultTo(false);
    table.boolean('allow_map_roles').notNullable().defaultTo(false);
  })
  .then(() => knex.raw('ALTER TABLE restaurant_role_rights ENABLE ROW LEVEL SECURITY'))
  .then(() => knex.raw('GRANT SELECT ON account_role TO authenticated_user'))
  .then(() => knex.raw('GRANT SELECT ON restaurant_role_rights TO authenticated_user'))
  .then(() => knex.raw(`
    CREATE POLICY access_role_rights ON restaurant_role_rights
      FOR ALL TO guest
    USING (
      restaurant_role_rights.role IS NULL OR
      EXISTS (
        SELECT 1 FROM restaurant_account WHERE
          restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER AND
          restaurant_account.restaurant = COALESCE(restaurant_role_rights.restaurant, restaurant_account.restaurant) AND
          restaurant_role_rights.role = restaurant_account.role
        ORDER BY restaurant_role_rights.restaurant NULLS LAST LIMIT 1
      ) OR EXISTS (
        SELECT 1 FROM restaurant_account WHERE
          restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER AND
          restaurant_account.restaurant = COALESCE(restaurant_role_rights.restaurant, restaurant_account.restaurant) AND
          restaurant_role_rights.role = restaurant_account.role AND
          (allow_update_restaurant_roles OR allow_map_roles)
        ORDER BY restaurant_role_rights.restaurant NULLS LAST LIMIT 1
      )
    )
    WITH CHECK (EXISTS(
      SELECT 1 FROM restaurant_account WHERE
        restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER AND
        restaurant_account.restaurant = restaurant_role_rights.restaurant AND
        restaurant_role_rights.role = restaurant_account.role AND
        (allow_update_restaurant_roles OR allow_map_roles)
    ))
  `));

exports.down = knex => knex.raw('DROP POLICY access_role_rights ON restaurant_role_rights')
  .then(() => knex.raw('REVOKE SELECT ON account_role FROM authenticated_user'))
  .then(() => knex.raw('REVOKE SELECT ON restaurant_role_rights FROM authenticated_user'))
  .then(() => knex.schema.dropTable('restaurant_role_rights'));
