const {defaultSchema} = require('../db');

exports.up = knex => knex.schema.withSchema(defaultSchema).table('menu_item', table => {
  table.boolean('enabled').notNullable().defaultTo(true);
})
  .then(() => knex.raw(`
    CREATE OR REPLACE FUNCTION ${defaultSchema}.create_menu_item(menu_item ${defaultSchema}.menu_item) RETURNS ${defaultSchema}.menu_item
    AS $$
      INSERT INTO ${defaultSchema}.menu_item (created_by, restaurant, type, category, price, currency, enabled) VALUES
        (
          current_setting('jwt.claims.account_id')::INTEGER,
          menu_item.restaurant,
          menu_item.type,
          menu_item.category,
          menu_item.price,
          menu_item.currency,
          COALESCE(menu_item.enabled, true)
        )
      RETURNING *
    $$ LANGUAGE sql
  `))
  .then(() => knex.raw(`
    CREATE OR REPLACE FUNCTION ${defaultSchema}.update_menu_item(menu_item ${defaultSchema}.menu_item) RETURNS ${defaultSchema}.menu_item
    AS $$
      UPDATE ${defaultSchema}.menu_item m SET
        type = menu_item.type,
        category = menu_item.category,
        price = menu_item.price,
        currency = menu_item.currency,
        enabled = COALESCE(menu_item.enabled, m.enabled),
        updated_at = now()
      WHERE
        m.id = menu_item.id
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
  `));

exports.down = knex => knex.raw(`DROP FUNCTION ${defaultSchema}.create_menu_item(${defaultSchema}.menu_item)`)
  .then(() => knex.raw(`DROP FUNCTION ${defaultSchema}.create_menu_item_information(${defaultSchema}.menu_item_information)`))
  .then(() => knex.raw(`DROP FUNCTION ${defaultSchema}.update_menu_item(${defaultSchema}.menu_item)`))
  .then(() => knex.raw(`DROP FUNCTION ${defaultSchema}.update_menu_item_information(${defaultSchema}.menu_item_information)`))
  .then(() => knex.schema.withSchema(defaultSchema).table('menu_item', table => {
    table.dropColumn('enabled');
  }));
