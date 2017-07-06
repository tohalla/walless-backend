const {defaultSchema} = require('../db');

exports.up = knex => knex.schema.withSchema(defaultSchema).table('restaurant_role_rights', table => {
  table.boolean('allow_download_qr_codes').notNullable().defaultTo(false);
});

exports.down = knex => knex.schema.withSchema(defaultSchema).table('restaurant_role_rights', table => {
  table.dropColumn('allow_download_qr_codes');
});
