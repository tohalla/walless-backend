const {defaultSchema} = require('../db');

exports.up = knex => knex.schema.withSchema(defaultSchema).table('restaurant_role_rights', table => {
  table.boolean('allow_messaging_with_customers').notNullable().defaultTo(false);
  table.boolean('is_employee').notNullable().defaultTo(false);
});

exports.down = knex => knex.schema.withSchema(defaultSchema).table('restaurant_role_rights', table => {
  table.dropColumn('allow_messaging_with_customers');
  table.dropColumn('is_employee');
});
