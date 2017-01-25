/* eslint-disable import/no-commonjs, fp/no-mutation, better/explicit-return, fp/no-nil */
exports.up = knex => knex.schema.table('restaurant_role_rights', table => {
  table.boolean('allow_upload_image').notNullable().defaultTo(false);
  table.boolean('allow_delete_image').notNullable().defaultTo(false);
});

exports.down = knex => knex.schema.table('restaurant_role_rights', table => {
  table.dropColumn('allow_upload_image');
  table.dropColumn('allow_delete_image');
});
