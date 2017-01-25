/* eslint-disable import/no-commonjs */
exports.up = knex => knex.schema.table('restaurant_role_rights', table => {
  table.boolean('allow_upload_file').notNullable().defaultTo(false);
  table.boolean('allow_delete_file').notNullable().defaultTo(false);
});

exports.down = knex => knex.schema.table('restaurant_role_rights', table => {
  table.dropColumn('allow_upload_file');
  table.dropColumn('allow_delete_file');
});
