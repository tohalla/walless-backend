const {defaultSchema} = require('../db');

exports.up = knex => knex.schema.withSchema(defaultSchema).createTable('currency', table => {
  table.string('code', 3).primary();
  table.string('name', 64).notNullable().unique();
  table.string('symbol', 3).notNullable();
  table.boolean('zero_decimal').notNullable().defaultTo(false);
})
  .then(() => knex.raw(`GRANT SELECT ON ${defaultSchema}.currency TO guest`))
  .then(() => knex.schema.withSchema(defaultSchema).table('menu_item', table => {
    table
      .decimal('price', 13, 2)
      .unsigned()
      .notNullable();
    table
      .string('currency', 3)
      .notNullable()
      .references('code').inTable(`${defaultSchema}.currency`);
  }))
  .then(() => knex.schema.withSchema(defaultSchema).table('restaurant', table => {
    table
      .string('currency', 3)
      .notNullable()
      .references('code').inTable(`${defaultSchema}.currency`);
  }));

exports.down = knex => knex.schema.withSchema(defaultSchema).table('menu_item', table => {
  table.dropColumn('price');
  table.dropColumn('currency');
})
  .then(() => knex.schema.withSchema(defaultSchema).table('restaurant', table => {
    table.dropColumn('currency');
  }))
  .then(() => knex.schema.withSchema(defaultSchema).dropTable('currency'));
