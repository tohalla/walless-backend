const {defaultSchema} = require('../db');

exports.up = knex => knex.raw(`
  CREATE OR REPLACE FUNCTION ${defaultSchema}.link_restaurant_owner() RETURNS TRIGGER
  AS $$
    BEGIN
      INSERT INTO ${defaultSchema}.restaurant_account (restaurant, account, role) VALUES
        (NEW.id, NEW.created_by, 1);
      RETURN NEW;
    END;
  $$ LANGUAGE plpgsql
`)
  .then(() => knex.raw(`DROP POLICY access_restaurant_accounts ON ${defaultSchema}.restaurant_account`))
  .then(() => knex.raw(`
    CREATE POLICY access_restaurant_accounts ON ${defaultSchema}.restaurant_account
      FOR SELECT TO restaurant_employee
    USING (true)
  `))
  .then(() => knex.raw(`
    CREATE POLICY update_restaurant_accounts ON ${defaultSchema}.restaurant_account
      FOR UPDATE TO restaurant_employee
    USING (true)
    WITH CHECK ((
      SELECT allow_map_roles FROM ${defaultSchema}.restaurant_account a
        JOIN ${defaultSchema}.restaurant_role_rights ON restaurant_role_rights.role = a.role
      WHERE
        restaurant_account.restaurant = a.restaurant AND
        a.account = current_setting('jwt.claims.account_id')::INTEGER
      ORDER BY restaurant_role_rights.restaurant NULLS LAST LIMIT 1
    ));
  `))
  .then(() => knex.raw(`
    CREATE POLICY add_restaurant_owner ON ${defaultSchema}.restaurant_account
      FOR INSERT TO restaurant_owner
    WITH CHECK (
      restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER AND
      NOT EXISTS(SELECT 1 FROM ${defaultSchema}.restaurant_account a WHERE restaurant_account.restaurant = a.restaurant)
    )
  `));

exports.down = knex => knex.raw(`
  CREATE OR REPLACE FUNCTION ${defaultSchema}.link_restaurant_owner() RETURNS TRIGGER
  AS $$
    DECLARE token uuid;
    BEGIN
      INSERT INTO restaurant_account (restaurant, account, role) VALUES
        (NEW.id, NEW.created_by, 1);
      RETURN NEW;
    END;
  $$ LANGUAGE plpgsql
`)
  .then(() => knex.raw(`DROP POLICY access_restaurant_accounts ON ${defaultSchema}.restaurant_account`))
  .then(() => knex.raw(`DROP POLICY update_restaurant_accounts ON ${defaultSchema}.restaurant_account`))
  .then(() => knex.raw(`DROP POLICY add_restaurant_owner ON ${defaultSchema}.restaurant_account`))
  .then(() => knex.raw(`
    CREATE POLICY access_restaurant_accounts ON ${defaultSchema}.restaurant_account
      FOR ALL TO authenticated_user
    USING (true)
    WITH CHECK ((
      SELECT allow_map_roles FROM ${defaultSchema}.restaurant_account a
        JOIN ${defaultSchema}.restaurant_role_rights ON restaurant_role_rights.role = a.role
      WHERE
        restaurant_account.restaurant = a.restaurant AND
        a.account = current_setting('jwt.claims.account_id')::INTEGER
      ORDER BY restaurant_role_rights.restaurant NULLS LAST LIMIT 1
    ))
  `));
