exports.up = knex => knex.schema.withSchema('auth').createTable('client', table => {
  table
    .string('id', 36)
    .primary()
    .defaultTo(knex.raw('gen_random_uuid()'));
  table.timestamp('created_at').notNullable().defaultTo('now()');
  table.string('refresh_token', 36);
  table.string('device', 64);
  table.integer('account')
    .references('id').inTable('auth.login')
    .onDelete('CASCADE');
});

exports.down = knex => knex.schema.withSchema('auth').dropTable('client');
