const {defaultSchema} = require('../db');

exports.up = knex => knex.schema.withSchema(defaultSchema).table('account', table => {
  table.timestamp('created_at').notNullable().defaultTo(knex.fn.now()).alter();
})
  .then(() => knex.schema.withSchema(defaultSchema).table('account_role', table => {
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now()).alter();
  }))
  .then(() => knex.schema.withSchema(defaultSchema).table('file', table => {
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now()).alter();
  }))
  .then(() => knex.schema.withSchema(defaultSchema).table('image', table => {
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now()).alter();
  }))
  .then(() => knex.schema.withSchema(defaultSchema).table('menu', table => {
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now()).alter();
  }))
  .then(() => knex.schema.withSchema(defaultSchema).table('menu_item', table => {
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now()).alter();
  }))
  .then(() => knex.schema.withSchema(defaultSchema).table('order', table => {
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now()).alter();
  }))
  .then(() => knex.schema.withSchema(defaultSchema).table('restaurant', table => {
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now()).alter();
  }))
  .then(() => knex.schema.withSchema(defaultSchema).table('serving_location', table => {
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now()).alter();
  }))
  .then(() => knex.schema.withSchema('auth').table('client', table => {
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now()).alter();
  }))
  .then(() => knex.schema.withSchema('auth').table('validation_token', table => {
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now()).alter();
  }));

exports.down = () => {};
