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
  .then(() => knex.schema.withSchema(defaultSchema).createTable('order_item', table => {
    table.increments();
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
  }))
  .then(() => knex.raw(`GRANT SELECT, INSERT ON ${defaultSchema}.order_item TO authenticated_user`))
  .then(() => knex.raw(`GRANT SELECT, INSERT ON ${defaultSchema}."order" TO authenticated_user`))
  .then(() => knex.raw(`GRANT SELECT, USAGE on ${defaultSchema}.order_id_seq to authenticated_user`))
  .then(() => knex.raw(`GRANT SELECT, USAGE on ${defaultSchema}.order_item_id_seq to authenticated_user`))
  .then(() => knex.raw(`ALTER TABLE ${defaultSchema}.order_item ENABLE ROW LEVEL SECURITY`))
  .then(() => knex.raw(`
    CREATE POLICY select_order_item ON ${defaultSchema}.order_item
      FOR SELECT TO authenticated_user USING (true)
  `))
  .then(() => knex.raw(`
    CREATE POLICY insert_order_item ON ${defaultSchema}.order_item
      FOR INSERT TO authenticated_user
    WITH CHECK (EXISTS(
      SELECT 1 FROM ${defaultSchema}."order" WHERE
        order_item."order" = ${defaultSchema}."order".id AND
        ${defaultSchema}."order".created_by = current_setting('jwt.claims.account_id')::INTEGER
    ))
  `));

exports.down = knex => knex.schema.withSchema(defaultSchema).dropTable('order_item')
  .then(() => knex.schema.withSchema(defaultSchema).dropTable('order'));
