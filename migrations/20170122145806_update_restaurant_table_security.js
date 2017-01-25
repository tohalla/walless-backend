/* eslint-disable import/no-commonjs */
exports.up = knex => knex.raw('GRANT INSERT, DELETE, UPDATE ON restaurant TO restaurant_owner')
  .then(() => knex.raw('GRANT SELECT, USAGE ON restaurant_id_seq TO restaurant_owner'))
  .then(() => knex.raw('GRANT INSERT, UPDATE, DELETE ON restaurant_account TO restaurant_owner'))
  .then(() => knex.raw('GRANT SELECT ON restaurant_account TO guest'))
  .then(() => knex.raw('ALTER TABLE restaurant ENABLE ROW LEVEL SECURITY'))
  .then(() => knex.raw('ALTER TABLE restaurant_account ENABLE ROW LEVEL SECURITY'))
  .then(() => knex.schema.table('restaurant_role_rights', table => {
    table.dropColumn('allow_change_restaurant_description');
    table.dropColumn('allow_change_restaurant_name');
    table.boolean('allow_update_restaurant').notNullable().defaultTo(false);
  }))
  .then(() => knex.raw(`
    CREATE POLICY select_restaurant ON restaurant
      FOR SELECT USING (true)
  `))
  .then(() => knex.raw(`
    CREATE POLICY insert_restaurant ON restaurant
      FOR INSERT WITH CHECK (true)
  `))
  .then(() => knex.raw(`
    CREATE POLICY update_restaurant ON restaurant
      FOR UPDATE TO restaurant_owner
    USING ((
      SELECT restaurant_role_rights.allow_update_restaurant FROM restaurant_account
        JOIN restaurant_role_rights ON restaurant_role_rights.role = restaurant_account.role
        WHERE
          restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER AND
          restaurant.id = restaurant_account.restaurant
    ))
    WITH CHECK ((
      SELECT restaurant_role_rights.allow_update_restaurant FROM restaurant_account
        JOIN restaurant_role_rights ON restaurant_role_rights.role = restaurant_account.role
        WHERE
          restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER AND
          restaurant.id = restaurant_account.restaurant
    ))
  `))
  .then(() => knex.raw(`
    CREATE POLICY select_restaurant_account ON restaurant_account
      FOR SELECT USING (true)
  `))
  .then(() => knex.raw(`
    CREATE POLICY insert_restaurant_account ON restaurant_account
      FOR INSERT WITH CHECK ((
        SELECT restaurant_role_rights.allow_map_roles FROM restaurant_role_rights
          WHERE
            restaurant_role_rights.role = restaurant_account.role AND
            restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER AND
            restaurant_account.restaurant = restaurant_account.restaurant
      ))
  `))
  .then(() => knex.raw(`
    CREATE POLICY update_restaurant_account ON restaurant_account
      FOR UPDATE TO restaurant_owner
    USING ((
      SELECT restaurant_role_rights.allow_map_roles FROM restaurant_role_rights
        WHERE
          restaurant_role_rights.role = restaurant_account.role AND
          restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER AND
          restaurant_account.restaurant = restaurant_account.restaurant
    ))
    WITH CHECK ((
      SELECT restaurant_role_rights.allow_map_roles FROM restaurant_role_rights
        WHERE
          restaurant_role_rights.role = restaurant_account.role AND
          restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER AND
          restaurant_account.restaurant = restaurant_account.restaurant
    ))
  `))
  .then(() => knex.raw(`
    CREATE OR REPLACE FUNCTION link_restaurant_owner() RETURNS TRIGGER
    AS $$
      DECLARE token uuid;
      BEGIN
        INSERT INTO restaurant_account (restaurant, account, role) VALUES
          (NEW.id, NEW.created_by, 1);
        RETURN NEW;
      END;
    $$ LANGUAGE plpgsql
    `))
  .then(() => knex.raw(`
    CREATE TRIGGER link_restaurant_owner
      AFTER INSERT ON restaurant
        FOR EACH ROW EXECUTE PROCEDURE link_restaurant_owner();
  `));

exports.down = knex => knex.raw('DROP POLICY update_restaurant ON restaurant')
  .then(() => knex.raw('DROP POLICY select_restaurant ON restaurant'))
  .then(() => knex.raw('DROP POLICY insert_restaurant ON restaurant'))
  .then(() => knex.raw('DROP POLICY insert_restaurant_account ON restaurant_account'))
  .then(() => knex.raw('DROP POLICY select_restaurant_account ON restaurant_account'))
  .then(() => knex.raw('DROP POLICY update_restaurant_account ON restaurant_account'))
  .then(() => knex.raw('DROP TRIGGER link_restaurant_owner ON restaurant'))
  .then(() => knex.raw('DROP FUNCTION link_restaurant_owner()'))
  .then(() => knex.schema.table('restaurant_role_rights', table => {
    table.dropColumn('allow_update_restaurant');
    table.boolean('allow_change_restaurant_description').notNullable().defaultTo(false);
    table.boolean('allow_change_restaurant_name').notNullable().defaultTo(false);
  }))
  .then(() => knex.raw('ALTER TABLE restaurant DISABLE ROW LEVEL SECURITY'))
  .then(() => knex.raw('ALTER TABLE restaurant_account DISABLE ROW LEVEL SECURITY'))
  .then(() => knex.raw('REVOKE INSERT, DELETE, UPDATE ON restaurant_account FROM restaurant_owner'))
  .then(() => knex.raw('REVOKE SELECT ON restaurant_account FROM guest'))
  .then(() => knex.raw('REVOKE INSERT, DELETE, UPDATE ON restaurant FROM restaurant_owner'))
  .then(() => knex.raw('REVOKE SELECT, USAGE on restaurant_id_seq FROM restaurant_owner'));
