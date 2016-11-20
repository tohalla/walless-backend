/* eslint-disable import/no-commonjs, fp/no-mutation, better/explicit-return, fp/no-nil */
exports.up = knex =>
  knex.schema.createTable('menu', table => {
    table.increments(); // id
    table.string('name', 255).notNullable();
    table.integer('created_by')
      .references('restaurant.id')
      .index()
      .notNullable()
      .unsigned();
    table.text('description');
    table.timestamp('created_at').notNullable().defaultTo('now()');
    table.timestamp('updated_at');
  })
    .then(() => knex.schema.createTable('menu_item', table => {
      table.increments(); // id
      table.string('name', 255).notNullable();
      table.text('description');
      table.timestamp('created_at').notNullable().defaultTo('now()');
      table.timestamp('updated_at');
    }))
    .then(() =>
      knex.schema.createTable('menu_menu_item', table => {
        table.integer('menu')
          .references('menu.id')
          .onDelete('CASCADE')
          .unsigned()
          .index()
          .notNullable();
        table.integer('menu_item')
          .references('menu_item.id')
          .onDelete('CASCADE')
          .unsigned()
          .index()
          .notNullable();
      }));

exports.down = knex =>
  knex.schema.dropTable('menu_menu_item')
    .then(() => knex.schema.dropTable('menu_item'))
    .then(() => knex.schema.dropTable('menu'));