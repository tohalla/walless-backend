/* eslint-disable import/no-commonjs */
exports.up = knex =>
  knex.schema.createTable('restaurant', table => {
    table.increments(); // id
    table.timestamp('created_at').notNullable().defaultTo('now()');
    table.timestamp('updated_at');
    table.string('name', 255).notNullable().comment('Name field');
    table.text('description');
  })
  .then(() =>
    knex.schema.createTable('account_role', table => {
      table.increments();
      table.timestamp('created_at').notNullable().defaultTo('now()');
      table.timestamp('updated_at');
      table.string('name', 128).notNullable().comment('Name field');
      table.text('description')
        .comment('Description field for account level');
      table.integer('restaurant')
        .references('restaurant.id')
        .onDelete('CASCADE')
        .nullable()
        .index()
        .defaultTo(null)
        .unsigned();
    })
  )
  .then(() =>
    knex.schema.createTable('restaurant_account', table => {
      table.integer('restaurant')
        .references('restaurant.id')
        .onDelete('CASCADE')
        .unsigned()
        .index()
        .notNullable();
      table.integer('account')
        .references('account.id')
        .onDelete('CASCADE')
        .index()
        .unsigned()
        .notNullable();
      table.integer('role')
        .references('account_role.id')
        .unsigned()
        .notNullable();
      table.primary(['restaurant', 'account']);
    })
  )
  .then(() =>
    knex.schema.createTable('restaurant_email', table => {
      table.integer('restaurant')
        .references('restaurant.id')
        .onDelete('CASCADE')
        .index()
        .unsigned()
        .notNullable();
      table.integer('email')
        .references('email.id')
        .onDelete('CASCADE')
        .unsigned()
        .notNullable();
      table.primary(['restaurant', 'email']);
    })
  );

exports.down = knex =>
  knex.schema.dropTable('restaurant_account')
    .then(() => knex.schema.dropTable('account_role'))
    .then(() => knex.schema.dropTable('restaurant_email'))
    .then(() => knex.schema.dropTable('restaurant'));
