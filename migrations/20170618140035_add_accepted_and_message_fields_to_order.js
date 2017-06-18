const {defaultSchema} = require('../db');

exports.up = knex =>
  knex.schema.withSchema(defaultSchema).table('order', table => {
    table.string('message', 512);
    table.timestamp('accepted');
    table.timestamp('declined');
    table.timestamp('paid');
    table.renameColumn('order_completed', 'completed');
  });

exports.down = knex =>
  knex.schema.withSchema(defaultSchema).table('order', table => {
    table.dropColumn('message');
    table.dropColumn('accepted');
    table.dropColumn('declined');
    table.dropColumn('paid');
    table.renameColumn('completed', 'order_completed');
  });
