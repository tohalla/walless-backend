const {defaultSchema} = require('../db');

exports.up = knex => knex.schema.withSchema(defaultSchema).table('menu', table => {
  table.boolean('enabled').notNullable().defaultTo(true);
})
  .then(() => knex.raw(`
    CREATE OR REPLACE FUNCTION ${defaultSchema}.create_menu(menu ${defaultSchema}.menu) RETURNS ${defaultSchema}.menu
    AS $$
      INSERT INTO ${defaultSchema}.menu (created_by, restaurant, enabled) VALUES
        (current_setting('jwt.claims.account_id')::INTEGER, menu.restaurant, COALESCE(menu.enabled, true))
      RETURNING *
    $$ LANGUAGE sql
  `))
  .then(() => knex.raw(`
    CREATE OR REPLACE FUNCTION ${defaultSchema}.update_menu(menu ${defaultSchema}.menu) RETURNS ${defaultSchema}.menu
    AS $$
      UPDATE ${defaultSchema}.menu m SET
        enabled = COALESCE(menu.enabled, m.enabled),
        updated_at = now()
      WHERE
        m.id = menu.id
      RETURNING *
    $$ LANGUAGE sql
  `))
  .then(() => knex.raw(`
    CREATE OR REPLACE FUNCTION ${defaultSchema}.create_menu_information(menu_information ${defaultSchema}.menu_information) RETURNS ${defaultSchema}.menu_information
    AS $$
      INSERT INTO ${defaultSchema}.menu_information VALUES
        (menu_information.*)
      RETURNING *
    $$ LANGUAGE sql
  `))
  .then(() => knex.raw(`
    CREATE OR REPLACE FUNCTION ${defaultSchema}.update_menu_information(menu_information ${defaultSchema}.menu_information) RETURNS ${defaultSchema}.menu_information
    AS $$
      UPDATE ${defaultSchema}.menu_information m SET
        name = COALESCE(menu_information.name, m.name),
        description = COALESCE(menu_information.description, m.description)
      WHERE
        m.language = menu_information.language AND
        m.menu = menu_information.menu
      RETURNING *
    $$ LANGUAGE sql
  `));

exports.down = knex => knex.raw(`DROP FUNCTION ${defaultSchema}.create_menu(${defaultSchema}.menu)`)
  .then(() => knex.raw(`DROP FUNCTION ${defaultSchema}.create_menu_information(${defaultSchema}.menu_information)`))
  .then(() => knex.raw(`DROP FUNCTION ${defaultSchema}.update_menu(${defaultSchema}.menu)`))
  .then(() => knex.raw(`DROP FUNCTION ${defaultSchema}.update_menu_information(${defaultSchema}.menu_information)`))
  .then(() => knex.schema.withSchema(defaultSchema).table('menu', table => {
    table.dropColumn('enabled');
  }));
