/* eslint-disable import/no-commonjs */
exports.up = knex => knex.schema.createTable('location', table => {
  table.increments(); // id
  table.specificType('coordinates', 'POINT');
  table.specificType('address', 'VARCHAR(35)[]');
  table.string('postal_code', 16);
  table.string('city', 255);
})
  .then(() => knex.schema.table('restaurant', table => {
    table.boolean('enabled').notNullable().defaultTo(true),
    table.integer('created_by')
      .references('account.id')
      .notNullable()
      .unsigned();
    table.integer('location')
      .references('location.id')
      .onDelete('CASCADE')
      .nullable()
      .unsigned();
  }));

exports.down = knex => knex.schema.table('restaurant', table => {
  table.dropColumn('location');
  table.dropColumn('created_by');
  table.dropColumn('enabled');
})
  .then(() => knex.schema.dropTable('location'));
