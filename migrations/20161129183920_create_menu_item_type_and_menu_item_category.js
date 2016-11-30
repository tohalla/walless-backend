/* eslint-disable import/no-commonjs, fp/no-mutation, better/explicit-return, fp/no-nil */
exports.up = knex =>
  knex.schema.createTable('menu_item_type', table => {
    table.increments(); // id
    table.string('name', 255).notNullable();
    table.text('description');
  })
    .then(() => knex.schema.createTable('menu_item_category', table => {
      table.increments(); // id
      table.string('name', 255).notNullable();
      table.integer('type')
        .references('menu_item_type.id')
        .onDelete('CASCADE')
        .unsigned()
        .index()
        .notNullable();
      table.text('description');
    }));

exports.down = knex =>
  knex.schema.dropTable('menu_item_category')
    .then(() => knex.schema.dropTable('menu_item_type'));
