/* eslint-disable import/no-commonjs, fp/no-mutation, better/explicit-return, fp/no-nil */
exports.up = knex =>
  knex.schema.createTable('email', table => {
    table.increments(); // id
    table.string('email', 128).notNullable();
    table.string('name', 128);
    table.string('description', 255);
  })
    .then(() => knex.schema.createTable('user', table => {
      table.increments(); // id
      table.timestamp('created_at').notNullable().defaultTo('now()');
      table.timestamp('updated_at');
      table.string('first_name', 64).notNullable().comment('First name field');
      table.string('last_name', 64).notNullable().comment('Last name field');
      table.integer('email')
        .references('email.id')
        .index()
        .unsigned()
        .notNullable()
        .comment('primary email address');
    })
  );

exports.down = knex =>
  knex.schema.dropTable('user')
    .then(() => knex.schema.dropTable('email'));
