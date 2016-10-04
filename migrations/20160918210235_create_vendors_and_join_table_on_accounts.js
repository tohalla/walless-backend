/* eslint-disable import/no-commonjs, fp/no-mutation, better/explicit-return, fp/no-nil */
exports.up = knex =>
  knex.schema.createTable('vendor', table => {
    table.increments(); // id
    table.timestamp('created_at').notNullable().defaultTo('now()');
    table.timestamp('updated_at');
    table.string('name', 128).notNullable().comment('Name field');
  })
  .then(() =>
    knex.schema.createTable('account_role', table => {
      table.increments();
      table.timestamp('created_at').notNullable().defaultTo('now()');
      table.timestamp('updated_at');
      table.string('name', 128).notNullable().comment('Name field');
      table.string('description', 255)
        .comment('Description field for account level');
      table.integer('created_by')
        .references('vendor.id')
        .nullable()
        .index()
        .defaultTo(null)
        .unsigned();
    })
  )
  .then(() =>
    knex.schema.createTable('vendor_account', table => {
      table.integer('vendor')
        .references('vendor.id')
        .unsigned()
        .index()
        .notNullable();
      table.integer('account')
        .references('account.id')
        .index()
        .unsigned()
        .notNullable();
      table.integer('role')
        .references('account_role.id')
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
  knex.schema.dropTable('vendor_account')
    .then(() => knex.schema.dropTable('account_role'))
    .then(() => knex.schema.dropTable('vendor_email'))
    .then(() => knex.schema.dropTable('vendor'));
