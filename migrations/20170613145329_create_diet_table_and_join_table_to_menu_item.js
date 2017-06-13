const {defaultSchema} = require('../db');
exports.up = knex =>
  knex.schema.withSchema(defaultSchema).createTable('diet', table => {
    table.increments(); // id
    table.string('name', 255).notNullable();
    table.text('description');
  })
    .then(() => knex.schema.withSchema(defaultSchema).createTable('menu_item_diet', table => {
      table.integer('menu_item')
        .references('id').inTable(`${defaultSchema}.menu_item`)
        .onDelete('CASCADE')
        .unsigned()
        .index()
        .notNullable();
      table.integer('diet')
        .references('id').inTable(`${defaultSchema}.diet`)
        .onDelete('CASCADE')
        .index()
        .unsigned()
        .notNullable();
      table.primary(['menu_item', 'diet']);
    }))
  .then(() => knex.raw(`GRANT SELECT ON ${defaultSchema}.menu_item_diet TO guest`))
  .then(() => knex.raw(`GRANT SELECT ON ${defaultSchema}.diet TO guest`));

exports.down = knex => knex.schema.withSchema(defaultSchema).dropTable('menu_item_diet')
    .then(() => knex.schema.withSchema(defaultSchema).dropTable('diet'));
