const {defaultSchema} = require('../db');

exports.up = knex => knex.raw(`
  CREATE OR REPLACE FUNCTION ${defaultSchema}.update_menu_item_diets(menu_item INTEGER, diets INTEGER[]) RETURNS SETOF ${defaultSchema}.menu_item_diet
  AS $$
    DECLARE r record;
    BEGIN
      DELETE FROM ${defaultSchema}.menu_item_diet WHERE menu_item_diet.menu_item = update_menu_item_diets.menu_item;
      INSERT INTO ${defaultSchema}.menu_item_diet (menu_item, diet) SELECT update_menu_item_diets.menu_item AS menu_item, diet FROM UNNEST(update_menu_item_diets.diets) AS diet;
      FOR r IN SELECT * FROM ${defaultSchema}.menu_item_diet WHERE menu_item_diet.menu_item = update_menu_item_diets.menu_item
      LOOP
        RETURN next r;
      END LOOP;
    END;
  $$ LANGUAGE plpgsql
`)
  .then(() => knex.raw(`GRANT EXECUTE ON FUNCTION ${defaultSchema}.update_menu_item_diets(INTEGER, INTEGER[]) TO restaurant_employee`))
  .then(() => knex.raw(`GRANT INSERT, DELETE ON ${defaultSchema}.menu_item_diet TO restaurant_employee`))
  .then(() => knex.raw(`ALTER TABLE ${defaultSchema}.menu_item_diet ENABLE ROW LEVEL SECURITY`))
  .then(() => knex.raw(`
    CREATE POLICY select_restaurant_diet ON ${defaultSchema}.menu_item_diet
      FOR SELECT USING (true)
  `))
  .then(() => knex.raw(`
    CREATE POLICY insert_restaurant_diet ON ${defaultSchema}.menu_item_diet
      FOR INSERT TO restaurant_employee
    WITH CHECK ((
      SELECT restaurant_role_rights.allow_update_menu_item FROM ${defaultSchema}.restaurant_account
        JOIN ${defaultSchema}.menu_item ON menu_item.id = menu_item_diet.menu_item AND menu_item.restaurant = restaurant_account.restaurant
        JOIN ${defaultSchema}.restaurant_role_rights ON restaurant_role_rights.role = restaurant_account.role
      WHERE
        restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER
    ))
  `))
  .then(() => knex.raw(`
    CREATE POLICY delete_restaurant_diet ON ${defaultSchema}.menu_item_diet
      FOR DELETE TO restaurant_employee
    USING ((
      SELECT restaurant_role_rights.allow_update_menu_item FROM ${defaultSchema}.restaurant_account
        JOIN ${defaultSchema}.menu_item ON menu_item.id = menu_item_diet.menu_item AND menu_item.restaurant = restaurant_account.restaurant
        JOIN ${defaultSchema}.restaurant_role_rights ON restaurant_role_rights.role = restaurant_account.role
      WHERE
        restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER
    ))
  `));

exports.down = knex => knex.raw(`DROP FUNCTION ${defaultSchema}.update_menu_item_diets(INTEGER, INTEGER[])`)
  .then(() => knex.raw(`DROP POLICY select_restaurant_diet ON ${defaultSchema}.menu_item_diet`))
  .then(() => knex.raw(`DROP POLICY insert_restaurant_diet ON ${defaultSchema}.menu_item_diet`))
  .then(() => knex.raw(`DROP POLICY delete_restaurant_diet ON ${defaultSchema}.menu_item_diet`))
  .then(() => knex.raw(`REVOKE INSERT, DELETE ON ${defaultSchema}.menu_item_diet FROM restaurant_employee`))
  .then(() => knex.raw(`ALTER TABLE ${defaultSchema}.menu_item_diet DISABLE ROW LEVEL SECURITY`));
