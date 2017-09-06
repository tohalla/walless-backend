const {defaultSchema} = require('../db');

exports.up = knex => knex.raw(`DROP FUNCTION ${defaultSchema}.create_restaurant_information(${defaultSchema}.restaurant_information)`)
  .then(() => knex.raw(`DROP FUNCTION ${defaultSchema}.update_restaurant_information(${defaultSchema}.restaurant_information)`))
  .then(() => knex.raw(`DROP FUNCTION ${defaultSchema}.create_menu_item_information(${defaultSchema}.menu_item_information)`))
  .then(() => knex.raw(`DROP FUNCTION ${defaultSchema}.update_menu_item_information(${defaultSchema}.menu_item_information)`))
  .then(() => knex.raw(`DROP FUNCTION ${defaultSchema}.create_menu_information(${defaultSchema}.menu_information)`))
  .then(() => knex.raw(`DROP FUNCTION ${defaultSchema}.update_menu_information(${defaultSchema}.menu_information)`))
  .then(() => knex.schema.withSchema(defaultSchema).renameTable('menu_information', 'menu_i18n'))
  .then(() => knex.schema.withSchema(defaultSchema).renameTable('menu_item_information', 'menu_item_i18n'))
  .then(() => knex.schema.withSchema(defaultSchema).renameTable('restaurant_information', 'restaurant_i18n'))
  .then(() => knex.raw(`
    CREATE OR REPLACE FUNCTION ${defaultSchema}.create_restaurant_i18n(restaurant_i18n ${defaultSchema}.restaurant_i18n) RETURNS ${defaultSchema}.restaurant_i18n
    AS $$
      INSERT INTO ${defaultSchema}.restaurant_i18n VALUES
        (restaurant_i18n.*)
      RETURNING *
    $$ LANGUAGE sql
  `))
  .then(() => knex.raw(`
    CREATE OR REPLACE FUNCTION ${defaultSchema}.update_restaurant_i18n(restaurant_i18n ${defaultSchema}.restaurant_i18n) RETURNS ${defaultSchema}.restaurant_i18n
    AS $$
      UPDATE ${defaultSchema}.restaurant_i18n m SET
        name = COALESCE(restaurant_i18n.name, m.name),
        description = COALESCE(restaurant_i18n.description, m.description)
      WHERE
        m.language = restaurant_i18n.language AND
        m.restaurant = restaurant_i18n.restaurant
      RETURNING *
    $$ LANGUAGE sql
  `))
  .then(() => knex.raw(`
    CREATE OR REPLACE FUNCTION ${defaultSchema}.create_menu_item_i18n(menu_item_i18n ${defaultSchema}.menu_item_i18n) RETURNS ${defaultSchema}.menu_item_i18n
    AS $$
      INSERT INTO ${defaultSchema}.menu_item_i18n VALUES
        (menu_item_i18n.*)
      RETURNING *
    $$ LANGUAGE sql
  `))
  .then(() => knex.raw(`
    CREATE OR REPLACE FUNCTION ${defaultSchema}.update_menu_item_i18n(menu_item_i18n ${defaultSchema}.menu_item_i18n) RETURNS ${defaultSchema}.menu_item_i18n
    AS $$
      UPDATE ${defaultSchema}.menu_item_i18n m SET
        name = COALESCE(menu_item_i18n.name, m.name),
        description = COALESCE(menu_item_i18n.description, m.description)
      WHERE
        m.language = menu_item_i18n.language AND
        m.menu_item = menu_item_i18n.menu_item
      RETURNING *
    $$ LANGUAGE sql
  `))
  .then(() => knex.raw(`
    CREATE OR REPLACE FUNCTION ${defaultSchema}.create_menu_i18n(menu_i18n ${defaultSchema}.menu_i18n) RETURNS ${defaultSchema}.menu_i18n
    AS $$
      INSERT INTO ${defaultSchema}.menu_i18n VALUES
        (menu_i18n.*)
      RETURNING *
    $$ LANGUAGE sql
  `))
  .then(() => knex.raw(`
    CREATE OR REPLACE FUNCTION ${defaultSchema}.update_menu_i18n(menu_i18n ${defaultSchema}.menu_i18n) RETURNS ${defaultSchema}.menu_i18n
    AS $$
      UPDATE ${defaultSchema}.menu_i18n m SET
        name = COALESCE(menu_i18n.name, m.name),
        description = COALESCE(menu_i18n.description, m.description)
      WHERE
        m.language = menu_i18n.language AND
        m.menu = menu_i18n.menu
      RETURNING *
    $$ LANGUAGE sql
  `));


exports.down = knex => knex.raw(`DROP FUNCTION ${defaultSchema}.create_restaurant_i18n(${defaultSchema}.restaurant_i18n)`)
  .then(() => knex.raw(`DROP FUNCTION ${defaultSchema}.update_restaurant_i18n(${defaultSchema}.restaurant_i18n)`))
  .then(() => knex.raw(`DROP FUNCTION ${defaultSchema}.create_menu_item_i18n(${defaultSchema}.menu_item_i18n)`))
  .then(() => knex.raw(`DROP FUNCTION ${defaultSchema}.update_menu_item_i18n(${defaultSchema}.menu_item_i18n)`))
  .then(() => knex.raw(`DROP FUNCTION ${defaultSchema}.create_menu_i18n(${defaultSchema}.menu_i18n)`))
  .then(() => knex.raw(`DROP FUNCTION ${defaultSchema}.update_menu_i18n(${defaultSchema}.menu_i18n)`))
  .then(() => knex.schema.withSchema(defaultSchema).renameTable('menu_i18n', 'menu_information'))
  .then(() => knex.schema.withSchema(defaultSchema).renameTable('menu_item_i18n', 'menu_item_information'))
  .then(() => knex.schema.withSchema(defaultSchema).renameTable('restaurant_i18n', 'restaurant_information'))
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
  `))
  .then(() => knex.raw(`
    CREATE OR REPLACE FUNCTION ${defaultSchema}.create_menu_item_information(menu_item_information ${defaultSchema}.menu_item_information) RETURNS ${defaultSchema}.menu_item_information
    AS $$
      INSERT INTO ${defaultSchema}.menu_item_information VALUES
        (menu_item_information.*)
      RETURNING *
    $$ LANGUAGE sql
  `))
  .then(() => knex.raw(`
    CREATE OR REPLACE FUNCTION ${defaultSchema}.update_menu_item_information(menu_item_information ${defaultSchema}.menu_item_information) RETURNS ${defaultSchema}.menu_item_information
    AS $$
      UPDATE ${defaultSchema}.menu_item_information m SET
        name = COALESCE(menu_item_information.name, m.name),
        description = COALESCE(menu_item_information.description, m.description)
      WHERE
        m.language = menu_item_information.language AND
        m.menu_item = menu_item_information.menu_item
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
