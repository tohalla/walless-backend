/* eslint-disable import/no-commonjs */
exports.up = knex =>
  knex.raw('CREATE SCHEMA auth')
    .then(() => knex.raw('CREATE EXTENSION IF NOT EXISTS pgcrypto'))
    .then(() => knex.schema.withSchema('auth').createTable('login', table => {
      table
        .integer('id')
        .unsigned()
        .primary()
        .references('id').inTable('public.account')
        .onDelete('CASCADE');
      table.text('password');
      table.timestamp('last_successful_login');
      table
        .timestamp('last_login_attempt')
        .comment('records failed login attempts');
      table.string('role', 255).defaultTo('authenticated_user');
      table.boolean('validated').notNullable().defaultTo(false);
    }))
    .then(() => knex.schema.withSchema('auth').createTable('validation_token', table => {
      table
        .string('token', 36)
        .primary();
      table.timestamp('created_at').notNullable().defaultTo('now()');
      table.integer('account')
        .references('id').inTable('auth.login')
        .onDelete('CASCADE');
    }));

exports.down = knex =>
  knex.schema.withSchema('auth').dropTable('validation_token')
    .then(() => knex.schema.withSchema('auth').dropTable('login'))
    .then(() => knex.raw('DROP EXTENSION IF EXISTS pgcrypto'))
    .then(() => knex.raw('DROP SCHEMA auth'));
