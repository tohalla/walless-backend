const {defaultSchema} = require('../db');

exports.up = knex => knex.raw(`
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
`)
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
  .then(() => knex.raw(`
    CREATE OR REPLACE FUNCTION ${defaultSchema}.create_restaurant_information(restaurant_information ${defaultSchema}.restaurant_information) RETURNS ${defaultSchema}.restaurant_information
    AS $$
      INSERT INTO ${defaultSchema}.restaurant_information VALUES
        (restaurant_information.*)
      RETURNING *
    $$ LANGUAGE sql
  `))
  .then(() => knex.raw(`
    CREATE OR REPLACE FUNCTION ${defaultSchema}.update_restaurant_information(restaurant_information ${defaultSchema}.restaurant_information) RETURNS ${defaultSchema}.restaurant_information
    AS $$
      UPDATE ${defaultSchema}.restaurant_information m SET
        name = COALESCE(restaurant_information.name, m.name),
        description = COALESCE(restaurant_information.description, m.description)
      WHERE
        m.language = restaurant_information.language AND
        m.restaurant = restaurant_information.restaurant
      RETURNING *
    $$ LANGUAGE sql
  `));

exports.down = knex => knex.raw(`DROP FUNCTION ${defaultSchema}.create_restaurant(${defaultSchema}.restaurant)`)
  .then(() => knex.raw(`DROP FUNCTION ${defaultSchema}.create_restaurant_information(${defaultSchema}.restaurant_information)`))
  .then(() => knex.raw(`DROP FUNCTION ${defaultSchema}.update_restaurant(${defaultSchema}.restaurant)`))
  .then(() => knex.raw(`DROP FUNCTION ${defaultSchema}.update_restaurant_information(${defaultSchema}.restaurant_information)`));
