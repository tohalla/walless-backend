/* eslint-disable import/no-commonjs */
exports.up = knex => knex.schema.withSchema('auth').createTable('reset_token', table => {
  table
    .string('token', 36)
    .primary();
  table.timestamp('created_at').notNullable().defaultTo('now()');
  table.integer('account')
    .references('id').inTable('auth.login')
    .onDelete('CASCADE')
    .unique();
});

exports.down = knex =>
  knex.schema.withSchema('auth').dropTable('reset_token');
