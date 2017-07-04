const {defaultSchema} = require('../db');

exports.up = knex => knex.raw(`
  CREATE OR REPLACE FUNCTION ${defaultSchema}.create_order("order" ${defaultSchema}."order", items INTEGER[]) RETURNS ${defaultSchema}.order
  AS $$
    DECLARE o RECORD;
    DECLARE i RECORD;
  BEGIN
    INSERT INTO ${defaultSchema}."order" (created_by, restaurant, serving_location, completed, message, accepted, declined, paid) VALUES
      (
        current_setting('jwt.claims.account_id')::INTEGER,
        "order".restaurant,
        "order".serving_location,
        "order".completed,
        "order".message,
        "order".accepted,
        "order".declined,
        "order".paid
      )
      RETURNING * INTO o;
    FOR i IN SELECT item FROM UNNEST(items) item
    LOOP
      INSERT INTO ${defaultSchema}.order_item (menu_item, "order") VALUES (i.item, o.id);
    END LOOP;
    RETURN o;
  END;
  $$ LANGUAGE plpgsql
`)
  .then(() => knex.schema.withSchema(defaultSchema).table('order', table => {
    table.timestamp('updated_at');
  }))
  .then(() => knex.raw(`
    CREATE OR REPLACE FUNCTION ${defaultSchema}.update_order("order" ${defaultSchema}."order") RETURNS ${defaultSchema}.order
    AS $$
      UPDATE ${defaultSchema}."order" m SET
        completed = "order".completed,
        accepted = "order".accepted,
        declined = "order".declined,
        updated_at = now()
      WHERE
        m.id = "order".id
      RETURNING *
    $$ LANGUAGE sql
  `))
  .then(() => knex.schema.withSchema(defaultSchema).table('restaurant_role_rights', table => {
    table.boolean('allow_update_order').notNullable().defaultTo(false);
  }))
  .then(() => knex.raw(`ALTER TABLE ${defaultSchema}."order" ENABLE ROW LEVEL SECURITY`))
  .then(() => knex.raw(`
    CREATE POLICY select_order ON ${defaultSchema}."order"
      FOR SELECT TO authenticated_user USING (true)
  `))
  .then(() => knex.raw(`
    CREATE POLICY update_order ON ${defaultSchema}."order"
      FOR UPDATE TO restaurant_employee
    USING (true)
    WITH CHECK ((
      SELECT allow_update_order FROM ${defaultSchema}.restaurant_account
        JOIN ${defaultSchema}.restaurant_role_rights ON restaurant_role_rights.role = restaurant_account.role
      WHERE
        restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER AND
        restaurant_account.restaurant = "order".restaurant
    ))
  `));

exports.down = knex => knex.raw(`DROP FUNCTION ${defaultSchema}.create_order(${defaultSchema}.order, INTEGER[])`)
  .then(() => knex.raw(`DROP FUNCTION ${defaultSchema}.update_order(${defaultSchema}.order)`))
  .then(() => knex.raw(`DROP POLICY select_order ON ${defaultSchema}.order`))
  .then(() => knex.raw(`DROP POLICY update_order ON ${defaultSchema}.order`))
  .then(() => knex.schema.withSchema(defaultSchema).table('restaurant_role_rights', table => {
    table.dropColumn('allow_update_order');
  }))
  .then(() => knex.schema.withSchema(defaultSchema).table('order', table => {
    table.dropColumn('updated_at');
  }));
