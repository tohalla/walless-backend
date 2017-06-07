const {defaultSchema} = require('../db');

exports.up = knex => knex.schema.withSchema(defaultSchema).createTable('order', table => {
  table.increments();
  table.timestamp('created_at').notNullable().defaultTo('now()');
  table.timestamp('order_completed');
  table.integer('created_by')
    .references('id').inTable(`${defaultSchema}.account`)
    .notNullable()
    .unsigned()
    .index();
  table.integer('restaurant')
    .references('id').inTable(`${defaultSchema}.restaurant`)
    .notNullable()
    .unsigned()
    .onDelete('CASCADE')
    .index();
  table.integer('serving_location')
    .references('id').inTable(`${defaultSchema}.serving_location`)
    .unsigned()
    .index();
})
  .then(() => knex.schema.withSchema(defaultSchema).createTable('order_menu_item', table => {
      table.integer('menu_item')
        .references('id').inTable(`${defaultSchema}.menu_item`)
        .onDelete('CASCADE')
        .unsigned()
        .notNullable();
      table.integer('order')
        .references('id').inTable(`${defaultSchema}.order`)
        .onDelete('CASCADE')
        .index()
        .unsigned()
        .notNullable();
      table.primary(['menu_item', 'order']);
  }))
  .then(() => knex.raw(`GRANT SELECT, INSERT ON ${defaultSchema}.order_menu_item TO authenticated_user`))
  .then(() => knex.raw(`GRANT SELECT, INSERT ON ${defaultSchema}."order" TO authenticated_user`))
  .then(() => knex.raw(`GRANT SELECT, USAGE on ${defaultSchema}.order_id_seq to authenticated_user`))
  .then(() => knex.raw(`ALTER TABLE ${defaultSchema}.order_menu_item ENABLE ROW LEVEL SECURITY`))
  .then(() => knex.raw(`
    CREATE POLICY insert_order_menu_item ON ${defaultSchema}.order_menu_item
      FOR INSERT TO authenticated_user
    WITH CHECK (EXISTS(
      SELECT 1 FROM ${defaultSchema}."order" WHERE
        order_menu_item."order" = ${defaultSchema}."order".id AND
        ${defaultSchema}."order".created_by = current_setting('jwt.claims.account_id')::INTEGER
    ))
  `))

  .then(() => knex.raw(`
    CREATE OR REPLACE FUNCTION ${defaultSchema}.set_order_menu_items(o INTEGER, menu_items INTEGER[]) RETURNS SETOF ${defaultSchema}.order_menu_item
    AS $$
      DECLARE r record;
      BEGIN
        IF EXISTS(SELECT "order" FROM ${defaultSchema}.order_menu_item WHERE "order" = o) THEN
          RAISE 'order already placed';
        ELSE
          INSERT INTO ${defaultSchema}.order_menu_item ("order", menu_item) SELECT o AS "order", menu_item FROM UNNEST(menu_items) AS menu_item;
          FOR r IN SELECT * FROM ${defaultSchema}.order_menu_item WHERE order_menu_item."order" = o
          LOOP
            RETURN next r;
          END LOOP;
        END IF;
      END;
    $$ LANGUAGE plpgsql
  `))
  .then(() => knex.raw(`GRANT EXECUTE ON FUNCTION ${defaultSchema}.set_order_menu_items(INTEGER, INTEGER[]) TO authenticated_user`));

exports.down = knex => knex.raw(`DROP FUNCTION ${defaultSchema}.set_order_menu_items(INTEGER, INTEGER[])`)
  .then(() => knex.schema.withSchema(defaultSchema).dropTable('order_menu_item'))
  .then(() => knex.schema.withSchema(defaultSchema).dropTable('order'));
