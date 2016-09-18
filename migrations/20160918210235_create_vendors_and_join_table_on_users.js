/* eslint-disable import/no-commonjs, fp/no-mutation, better/explicit-return, fp/no-nil */
exports.up = knex =>
  knex.schema.createTable('vendor', table => {
    table.increments(); // id
    table.timestamp('created_at').notNullable().defaultTo('now()');
    table.timestamp('updated_at');
    table.string('name', 128).notNullable().comment('Name field');
  })
  .then(() =>
    knex.schema.createTable('user_role', table => {
      table.increments();
      table.timestamp('created_at').notNullable().defaultTo('now()');
      table.timestamp('updated_at');
      table.string('name', 128).notNullable().comment('Name field');
      table.string('description', 255)
        .comment('Description field for user level');
      table.integer('created_by')
        .references('vendor.id')
        .nullable()
        .index()
        .defaultTo(null)
        .unsigned();
    })
  )
  .then(() =>
    knex.schema.createTable('vendor_user', table => {
      table.integer('vendor')
        .references('vendor.id')
        .unsigned()
        .index()
        .notNullable();
      table.integer('user')
        .references('user.id')
        .index()
        .unsigned()
        .notNullable();
      table.integer('role')
        .references('user_role.id')
        .unsigned()
        .notNullable();
    })
  )
  .then(() =>
    knex.schema.createTable('vendor_email', table => {
      table.integer('vendor')
        .references('vendor.id')
        .index()
        .unsigned()
        .notNullable();
      table.integer('email')
        .references('email.id')
        .unsigned()
        .notNullable();
    })
  );

exports.down = knex =>
  knex.schema.dropTable('vendor_user')
    .then(() => knex.schema.dropTable('user_role'))
    .then(() => knex.schema.dropTable('vendor_email'))
    .then(() => knex.schema.dropTable('vendor'));
