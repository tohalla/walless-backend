/* eslint-disable import/no-commonjs, fp/no-mutation, better/explicit-return, fp/no-nil */
exports.up = knex =>
  knex.raw('CREATE SCHEMA auth')
    .then(() => knex.raw('CREATE EXTENSION IF NOT EXISTS pgcrypto'))
    .then(() => knex.schema.withSchema('auth').createTable('login', table => {
      table
        .integer('id')
        .unsigned()
        .primary()
        .references('id').inTable('public.login')
        .onDelete('CASCADE');
      table.string('password', 512).notNullable();
      table.string('role', 255);
    }))
    .then(() => knex.schema.withSchema('auth').createTable('validation_token', table => {
      table
        .string('token', 36)
        .primary();
      table.timestamp('created_at').notNullable().defaultTo('now()');
      table.integer('account')
        .references('id').inTable('public.account')
        .onDelete('CASCADE');
    }));

exports.down = knex =>
  knex.schema.withSchema('auth').dropTable('login')
    .then(() => knex.schema.withSchema('auth').dropTable('validation_token'))
    .then(() => knex.raw('DROP EXTENSION IF EXISTS pgcrypto'))
    .then(() => knex.raw('DROP SCHEMA auth'));
