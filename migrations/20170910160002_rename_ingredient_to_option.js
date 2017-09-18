const {defaultSchema} = require('../db');
exports.up = knex => knex.raw(`DROP FUNCTION ${defaultSchema}.update_menu_item_ingredients(${defaultSchema}.ingredient[])`)
  .then(() => knex.schema.withSchema(defaultSchema).dropTable('menu_item_ingredient'))
  .then(() => knex.schema.withSchema(defaultSchema).dropTable('ingredient_i18n'))
  .then(() => knex.schema.withSchema(defaultSchema).dropTable('ingredient'))
  .then(() => knex.schema.withSchema(defaultSchema).createTable('option', table => {
      table.increments();
    }))
    .then(() => knex.schema.withSchema(defaultSchema).createTable('option_i18n', table => {
      table
        .string('language', 5)
        .references('locale').inTable('translation.language')
        .index();
      table
        .integer('option')
        .unsigned()
        .references('id').inTable(`${defaultSchema}.option`)
        .onDelete('CASCADE');
      table.string('name', 255).notNullable();
      table.text('description');
      table.primary(['language', 'option']);
    }))
    .then(() => knex.schema.withSchema(defaultSchema).createTable('menu_item_option', table => {
      table.integer('menu_item')
        .references('id').inTable(`${defaultSchema}.menu_item`)
        .onDelete('CASCADE')
        .unsigned()
        .index()
        .notNullable();
      table.integer('option')
        .references('id').inTable(`${defaultSchema}.option`)
        .onDelete('CASCADE')
        .index()
        .unsigned()
        .notNullable();
      table.boolean('default_value').notNullable().defaultTo(false);
      table.primary(['menu_item', 'option']);
    }))
    .then(() => knex.raw(`GRANT SELECT ON ${defaultSchema}.menu_item_option TO guest`))
    .then(() => knex.raw(`GRANT SELECT ON ${defaultSchema}.option TO guest`))
    .then(() => knex.raw(`
      CREATE OR REPLACE FUNCTION ${defaultSchema}.update_menu_item_options(menu_item INTEGER, menu_item_options ${defaultSchema}.menu_item_option[])
        RETURNS SETOF ${defaultSchema}.menu_item_option
      AS $$
        DECLARE r record;
        BEGIN
          DELETE FROM ${defaultSchema}.menu_item_option WHERE menu_item_option.menu_item = update_menu_item_options.menu_item;
          INSERT INTO ${defaultSchema}.menu_item_option (menu_item, option, default_value)
            SELECT update_menu_item_options.menu_item, menu_item_option.option, menu_item_option.default_value
              FROM UNNEST(update_menu_item_options.menu_item_options) AS menu_item_option;
          FOR r IN SELECT * FROM ${defaultSchema}.menu_item_option WHERE menu_item_option.menu_item = update_menu_item_options.menu_item
          LOOP
            RETURN next r;
          END LOOP;
        END;
      $$ LANGUAGE plpgsql
    `))
    .then(() => knex.raw(`GRANT EXECUTE ON FUNCTION ${defaultSchema}.update_menu_item_options(INTEGER, ${defaultSchema}.menu_item_option[]) TO restaurant_employee`))
    .then(() => knex.raw(`GRANT INSERT, DELETE ON ${defaultSchema}.menu_item_option TO restaurant_employee`))
    .then(() => knex.raw(`ALTER TABLE ${defaultSchema}.menu_item_option ENABLE ROW LEVEL SECURITY`))
    .then(() => knex.raw(`
      CREATE POLICY select_restaurant_option ON ${defaultSchema}.menu_item_option
        FOR SELECT USING (true)
    `))
    .then(() => knex.raw(`
      CREATE POLICY insert_restaurant_option ON ${defaultSchema}.menu_item_option
        FOR INSERT TO restaurant_employee
      WITH CHECK ((
        SELECT restaurant_role_rights.allow_update_menu_item FROM ${defaultSchema}.restaurant_account
          JOIN ${defaultSchema}.menu_item ON menu_item.id = menu_item_option.menu_item AND menu_item.restaurant = restaurant_account.restaurant
          JOIN ${defaultSchema}.restaurant_role_rights ON restaurant_role_rights.role = restaurant_account.role
        WHERE
          restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER
      ))
    `))
    .then(() => knex.raw(`
      CREATE POLICY delete_restaurant_option ON ${defaultSchema}.menu_item_option
        FOR DELETE TO restaurant_employee
      USING ((
        SELECT restaurant_role_rights.allow_update_menu_item FROM ${defaultSchema}.restaurant_account
          JOIN ${defaultSchema}.menu_item ON menu_item.id = menu_item_option.menu_item AND menu_item.restaurant = restaurant_account.restaurant
          JOIN ${defaultSchema}.restaurant_role_rights ON restaurant_role_rights.role = restaurant_account.role
        WHERE
          restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER
      ))
    `))
    .then(() => knex.raw(`GRANT SELECT ON ${defaultSchema}.option_i18n TO guest`));

exports.down = knex => knex.raw(`DROP FUNCTION ${defaultSchema}.update_menu_item_options(INTEGER, ${defaultSchema}.menu_item_option[])`)
  .then(() => knex.schema.withSchema(defaultSchema).dropTable('menu_item_option'))
  .then(() => knex.schema.withSchema(defaultSchema).dropTable('option_i18n'))
  .then(() => knex.schema.withSchema(defaultSchema).dropTable('option'))
  .then(() => knex.schema.withSchema(defaultSchema).createTable('ingredient', table => {
    table.increments();
  }))
  .then(() => knex.schema.withSchema(defaultSchema).createTable('ingredient_i18n', table => {
    table
      .string('language', 5)
      .references('locale').inTable('translation.language')
      .index();
    table
      .integer('ingredient')
      .unsigned()
      .references('id').inTable(`${defaultSchema}.ingredient`)
      .onDelete('CASCADE');
    table.string('name', 255).notNullable();
    table.text('description');
    table.primary(['language', 'ingredient']);
  }))
  .then(() => knex.schema.withSchema(defaultSchema).createTable('menu_item_ingredient', table => {
    table.integer('menu_item')
      .references('id').inTable(`${defaultSchema}.menu_item`)
      .onDelete('CASCADE')
      .unsigned()
      .index()
      .notNullable();
    table.integer('ingredient')
      .references('id').inTable(`${defaultSchema}.ingredient`)
      .onDelete('CASCADE')
      .index()
      .unsigned()
      .notNullable();
    table.boolean('optional').notNullable().defaultTo(false);
    table.primary(['menu_item', 'ingredient']);
  }))
  .then(() => knex.raw(`GRANT SELECT ON ${defaultSchema}.menu_item_ingredient TO guest`))
  .then(() => knex.raw(`GRANT SELECT ON ${defaultSchema}.ingredient TO guest`))
  .then(() => knex.raw(`
    CREATE OR REPLACE FUNCTION ${defaultSchema}.update_menu_item_ingredients(ingredients ${defaultSchema}.ingredient[])
      RETURNS SETOF ${defaultSchema}.menu_item_ingredient
    AS $$
      DECLARE r record;
      BEGIN
        DELETE FROM ${defaultSchema}.menu_item_ingredient WHERE menu_item_ingredient.menu_item = update_menu_item_ingredients.menu_item;
        INSERT INTO ${defaultSchema}.menu_item_ingredient (menu_item, ingredient, optional)
          SELECT ingredient.menu_item, ingredient.ingredient, ingredient.optional
            FROM UNNEST(update_menu_item_ingredients.ingredients) AS ingredient;
        FOR r IN SELECT * FROM ${defaultSchema}.menu_item_ingredient WHERE menu_item_ingredient.menu_item = update_menu_item_ingredients.menu_item
        LOOP
          RETURN next r;
        END LOOP;
      END;
    $$ LANGUAGE plpgsql
  `))
  .then(() => knex.raw(`GRANT EXECUTE ON FUNCTION ${defaultSchema}.update_menu_item_ingredients(${defaultSchema}.ingredient[]) TO restaurant_employee`))
  .then(() => knex.raw(`GRANT INSERT, DELETE ON ${defaultSchema}.menu_item_ingredient TO restaurant_employee`))
  .then(() => knex.raw(`ALTER TABLE ${defaultSchema}.menu_item_ingredient ENABLE ROW LEVEL SECURITY`))
  .then(() => knex.raw(`
    CREATE POLICY select_restaurant_ingredient ON ${defaultSchema}.menu_item_ingredient
      FOR SELECT USING (true)
  `))
  .then(() => knex.raw(`
    CREATE POLICY insert_restaurant_ingredient ON ${defaultSchema}.menu_item_ingredient
      FOR INSERT TO restaurant_employee
    WITH CHECK ((
      SELECT restaurant_role_rights.allow_update_menu_item FROM ${defaultSchema}.restaurant_account
        JOIN ${defaultSchema}.menu_item ON menu_item.id = menu_item_ingredient.menu_item AND menu_item.restaurant = restaurant_account.restaurant
        JOIN ${defaultSchema}.restaurant_role_rights ON restaurant_role_rights.role = restaurant_account.role
      WHERE
        restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER
    ))
  `))
  .then(() => knex.raw(`
    CREATE POLICY delete_restaurant_ingredient ON ${defaultSchema}.menu_item_ingredient
      FOR DELETE TO restaurant_employee
    USING ((
      SELECT restaurant_role_rights.allow_update_menu_item FROM ${defaultSchema}.restaurant_account
        JOIN ${defaultSchema}.menu_item ON menu_item.id = menu_item_ingredient.menu_item AND menu_item.restaurant = restaurant_account.restaurant
        JOIN ${defaultSchema}.restaurant_role_rights ON restaurant_role_rights.role = restaurant_account.role
      WHERE
        restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER
    ))
  `));
