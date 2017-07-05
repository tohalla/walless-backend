const {defaultSchema} = require('../db');

exports.up = knex => knex.schema.withSchema(defaultSchema).createTable('address', table => {
  table.increments();
  table.string('route', 512).notNull();
  table.string('street_number', 10).notNull();
  table.string('postal_code', 6).notNull();
  table.string('country', 48).notNull();
  table.string('locality', 85).notNull();
  table.string('place_id', 512).notNull();
  table.specificType('coordinates', 'POINT').notNull();
})
  .then(() => knex.schema.withSchema(defaultSchema).table('restaurant', table => {
    table.dropColumn('location');
    table.integer('address')
      .references('id').inTable(`${defaultSchema}.address`)
      .onDelete('SET NULL')
      .nullable()
      .unsigned();
  }))
  .then(() => knex.schema.withSchema(defaultSchema).dropTable('location'))
  .then(() => knex.raw(`GRANT SELECT ON ${defaultSchema}.address TO guest`))
  .then(() => knex.raw(`GRANT INSERT ON ${defaultSchema}.address TO restaurant_employee`))
  .then(() => knex.raw(`
    CREATE OR REPLACE FUNCTION ${defaultSchema}.create_address(address ${defaultSchema}.address) RETURNS ${defaultSchema}.address
    AS $$
      INSERT INTO ${defaultSchema}.address (route, street_number, postal_code, country, locality, coordinates, place_id) VALUES
        (
          address.route,
          address.street_number,
          address.postal_code,
          address.country,
          address.locality,
          address.coordinates,
          address.place_id
        )
      RETURNING *
    $$ LANGUAGE sql
  `))
    .then(knex.raw(`
    CREATE OR REPLACE FUNCTION ${defaultSchema}.create_restaurant(restaurant ${defaultSchema}.restaurant) RETURNS ${defaultSchema}.restaurant
    AS $$
      INSERT INTO ${defaultSchema}.restaurant (created_by, enabled, currency, address) VALUES
        (
          current_setting('jwt.claims.account_id')::INTEGER,
          COALESCE(restaurant.enabled, true),
          restaurant.currency,
          restaurant.address
        )
      RETURNING *
    $$ LANGUAGE sql
  `))
  .then(() => knex.raw(`
    CREATE OR REPLACE FUNCTION ${defaultSchema}.update_restaurant(restaurant ${defaultSchema}.restaurant) RETURNS ${defaultSchema}.restaurant
    AS $$
      UPDATE ${defaultSchema}.restaurant m SET
        currency = COALESCE(restaurant.currency, m.currency),
        enabled = COALESCE(restaurant.enabled, m.enabled),
        address = restaurant.address,
        updated_at = now()
      WHERE
        m.id = restaurant.id
      RETURNING *
    $$ LANGUAGE sql
  `))
  .then(() => knex.raw(`GRANT SELECT, USAGE on ${defaultSchema}.address_id_seq TO restaurant_employee`));

exports.down = knex => knex.schema.withSchema(defaultSchema).createTable('location', table => {
  table.increments(); // id
  table.specificType('coordinates', 'POINT');
  table.specificType('address', 'VARCHAR(35)[]');
  table.string('postal_code', 16);
  table.string('city', 255);
})
    .then(knex.raw(`
    CREATE OR REPLACE FUNCTION ${defaultSchema}.create_restaurant(restaurant ${defaultSchema}.restaurant) RETURNS ${defaultSchema}.restaurant
    AS $$
      INSERT INTO ${defaultSchema}.restaurant (created_by, enabled, currency) VALUES
        (
          current_setting('jwt.claims.account_id')::INTEGER,
          COALESCE(restaurant.enabled, true),
          restaurant.currency
        )
      RETURNING *
    $$ LANGUAGE sql
  `))
  .then(() => knex.raw(`
    CREATE OR REPLACE FUNCTION ${defaultSchema}.update_restaurant(restaurant ${defaultSchema}.restaurant) RETURNS ${defaultSchema}.restaurant
    AS $$
      UPDATE ${defaultSchema}.restaurant m SET
        currency = restaurant.currency,
        enabled = COALESCE(restaurant.enabled, m.enabled),
        updated_at = now()
      WHERE
        m.id = restaurant.id
      RETURNING *
    $$ LANGUAGE sql
  `))
  .then(() => knex.raw(`DROP FUNCTION ${defaultSchema}.create_address(${defaultSchema}.address)`))
  .then(() => knex.schema.withSchema(defaultSchema).table('restaurant', table => {
    table.dropColumn('address');
    table.integer('location')
      .references('id').inTable(`${defaultSchema}.location`)
      .onDelete('CASCADE')
      .nullable()
      .unsigned();
  }))
  .then(() => knex.raw(`REVOKE SELECT ON ${defaultSchema}.address FROM guest`))
  .then(() => knex.raw(`REVOKE INSERT ON ${defaultSchema}.address FROM restaurant_employee`))
  .then(() => knex.schema.withSchema(defaultSchema).dropTable('address'));
