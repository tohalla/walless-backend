const {defaultSchema} = require('../db');

exports.up = knex => knex.raw(`
  CREATE OR REPLACE FUNCTION ${defaultSchema}.create_serving_location(serving_location ${defaultSchema}.serving_location) RETURNS ${defaultSchema}.serving_location
  AS $$
    INSERT INTO ${defaultSchema}.serving_location (name, enabled, restaurant) VALUES
      (
        serving_location.name,
        COALESCE(serving_location.enabled, true),
        serving_location.restaurant
      )
    RETURNING *
  $$ LANGUAGE sql
`)
  .then(() => knex.raw(`
    CREATE OR REPLACE FUNCTION ${defaultSchema}.update_serving_location(serving_location ${defaultSchema}.serving_location) RETURNS ${defaultSchema}.serving_location
    AS $$
      UPDATE ${defaultSchema}.serving_location m SET
        name = serving_location.name,
        enabled = COALESCE(serving_location.enabled, m.enabled),
        updated_at = now()
      WHERE
        m.id = serving_location.id
      RETURNING *
    $$ LANGUAGE sql
  `));

exports.down = knex => knex.raw(`DROP FUNCTION ${defaultSchema}.create_serving_location(${defaultSchema}.serving_location)`)
  .then(() => knex.raw(`DROP FUNCTION ${defaultSchema}.update_serving_location(${defaultSchema}.serving_location)`));
