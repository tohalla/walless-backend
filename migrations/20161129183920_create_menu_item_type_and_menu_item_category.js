/* eslint-disable import/no-commonjs */
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
    }))
    .then(() => knex.schema.table('menu_item', table => {
      table.integer('type')
        .references('menu_item_type.id')
        .unsigned()
        .index();
      table.integer('category')
        .references('menu_item_category.id')
        .unsigned()
        .index();
    }));

exports.down = knex =>
  knex.schema.table('menu_item', table => {
    table.dropForeign('type');
    table.dropColumn('type');
    table.dropForeign('category');
    table.dropColumn('category');
  })
    .then(() => knex.schema.dropTable('menu_item_category'))
    .then(() => knex.schema.dropTable('menu_item_type'));
