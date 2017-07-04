const {defaultSchema} = require('../db');

exports.up = knex =>
  knex.schema.withSchema(defaultSchema).createTable('serving_location_account', table => {
    table.integer('serving_location')
      .unsigned()
      .notNullable()
      .references('id').inTable(`${defaultSchema}.serving_location`)
      .onDelete('CASCADE');
    table.integer('account')
      .unsigned()
      .primary()
      .references('id').inTable(`${defaultSchema}.account`)
      .onDelete('CASCADE');
    table.timestamp('created_at').notNullable().defaultTo('now()');
  })
    .then(() => knex.raw(`GRANT SELECT, DELETE ON ${defaultSchema}.serving_location_account TO authenticated_user`))
    .then(() => knex.raw(`ALTER TABLE ${defaultSchema}.serving_location_account ENABLE ROW LEVEL SECURITY`))
    .then(() => knex.raw(`
      CREATE POLICY delete_serving_location_account ON ${defaultSchema}.serving_location_account
        FOR DELETE TO restaurant_employee
      USING ((
        SELECT restaurant_role_rights.allow_view_users FROM ${defaultSchema}.restaurant_account
          JOIN ${defaultSchema}.restaurant_role_rights ON restaurant_role_rights.role = restaurant_account.role
          JOIN ${defaultSchema}.serving_location ON serving_location_account.serving_location = serving_location.id AND serving_location.restaurant = restaurant_account.restaurant
        WHERE restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER
      ))
    `))
    .then(() => knex.schema.withSchema(defaultSchema).table('serving_location', table => {
      table
        .string('key', 36)
        .notNullable()
        .defaultTo(knex.raw('gen_random_uuid()'));
    }));

exports.down = knex =>
  knex.schema.withSchema(defaultSchema).dropTable('serving_location_account')
    .then(() => knex.schema.withSchema(defaultSchema).table('serving_location', table => {
      table.dropColumn('key');
    }));
