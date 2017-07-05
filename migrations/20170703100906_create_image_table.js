const {defaultSchema} = require('../db');

exports.up = knex => knex.schema.withSchema(defaultSchema).createTable('image', table => {
  table.increments();
  table.timestamp('created_at').notNullable().defaultTo('now()');
  table.integer('created_by')
    .references('id').inTable(`${defaultSchema}.account`)
    .notNullable()
    .unsigned();
  table.integer('restaurant')
    .references('id').inTable(`${defaultSchema}.restaurant`)
    .onDelete('CASCADE')
    .unsigned();
  table.text('uri').notNullable().unique();
  table.integer('thumbnail')
    .references('id').inTable(`${defaultSchema}.image`)
    .onDelete('CASCADE')
    .unsigned();
  table.string('key', 255).notNullable().unique();
})
  .then(() => knex.schema.withSchema(defaultSchema).table('restaurant_role_rights', table => {
    table.boolean('allow_upload_image').notNullable().defaultTo(false);
    table.boolean('allow_delete_image').notNullable().defaultTo(false);
  }))
  .then(() => knex.raw(`GRANT SELECT ON ${defaultSchema}.image TO guest`))
  .then(() => knex.raw(`GRANT INSERT, DELETE ON ${defaultSchema}.image TO restaurant_employee`))
  .then(() => knex.raw(`GRANT SELECT, USAGE on ${defaultSchema}.image_id_seq to restaurant_employee`))
  .then(() => knex.raw(`ALTER TABLE ${defaultSchema}.image ENABLE ROW LEVEL SECURITY`))
  .then(() => knex.raw(`
    CREATE POLICY select_image ON ${defaultSchema}.image
      FOR SELECT USING (true)
  `))
  .then(() => knex.raw(`
    CREATE POLICY insert_image ON ${defaultSchema}.image
      FOR INSERT TO restaurant_employee
    WITH CHECK ((
      SELECT restaurant_role_rights.allow_upload_image FROM ${defaultSchema}.restaurant_account
        JOIN ${defaultSchema}.restaurant_role_rights ON restaurant_role_rights.role = restaurant_account.role
      WHERE
        restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER AND
        image.restaurant = restaurant_account.restaurant
    ))
  `))
  .then(() => knex.raw(`
    CREATE POLICY delete_image ON ${defaultSchema}.image
      FOR DELETE TO restaurant_employee
    USING ((
      SELECT restaurant_role_rights.allow_delete_image FROM ${defaultSchema}.restaurant_account
        JOIN ${defaultSchema}.restaurant_role_rights ON restaurant_role_rights.role = restaurant_account.role
      WHERE
        restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER AND
        image.restaurant = restaurant_account.restaurant
    ))
  `))
  // menu_item
  .then(() => knex.schema.withSchema(defaultSchema).createTable('menu_item_image', table => {
    table.integer('menu_item')
      .references('id').inTable(`${defaultSchema}.menu_item`)
      .onDelete('CASCADE')
      .unsigned()
      .index()
      .notNullable();
    table.integer('image')
      .references('id').inTable(`${defaultSchema}.image`)
      .onDelete('CASCADE')
      .index()
      .unsigned()
      .notNullable();
    table.primary(['menu_item', 'image']);
  }))
  .then(() => knex.raw(`GRANT SELECT ON ${defaultSchema}.menu_item_image TO guest`))
  .then(() => knex.raw(`GRANT INSERT, DELETE ON ${defaultSchema}.menu_item_image TO restaurant_employee`))
  .then(() => knex.raw(`ALTER TABLE ${defaultSchema}.menu_item_image ENABLE ROW LEVEL SECURITY`))
  .then(() => knex.raw(`
    CREATE POLICY select_menu_item_image ON ${defaultSchema}.menu_item_image
      FOR SELECT USING (true)
  `))
  .then(() => knex.raw(`
    CREATE POLICY insert_menu_item_image ON ${defaultSchema}.menu_item_image
      FOR INSERT TO restaurant_employee
    WITH CHECK ((
      SELECT restaurant_role_rights.allow_upload_image FROM ${defaultSchema}.restaurant_account
        JOIN ${defaultSchema}.image ON image.id = menu_item_image.image AND image.restaurant = restaurant_account.restaurant
        JOIN ${defaultSchema}.restaurant_role_rights ON restaurant_role_rights.role = restaurant_account.role
      WHERE
        restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER
    ))
  `))
  .then(() => knex.raw(`
    CREATE POLICY delete_menu_item_image ON ${defaultSchema}.menu_item_image
      FOR DELETE TO restaurant_employee
    USING ((
      SELECT restaurant_role_rights.allow_delete_image FROM ${defaultSchema}.restaurant_account
        JOIN ${defaultSchema}.image ON image.id = menu_item_image.image AND image.restaurant = restaurant_account.restaurant
        JOIN ${defaultSchema}.restaurant_role_rights ON restaurant_role_rights.role = restaurant_account.role
      WHERE
        restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER
    ))
  `))
  .then(() => knex.raw(`
    CREATE OR REPLACE FUNCTION ${defaultSchema}.update_menu_item_images(menu_item INTEGER, images INTEGER[]) RETURNS SETOF ${defaultSchema}.menu_item_image
    AS $$
      DECLARE r record;
      BEGIN
        DELETE FROM ${defaultSchema}.menu_item_image WHERE menu_item_image.menu_item = update_menu_item_images.menu_item;
        INSERT INTO ${defaultSchema}.menu_item_image (menu_item, image) SELECT update_menu_item_images.menu_item AS menu_item, image FROM UNNEST(update_menu_item_images.images) AS image;
        FOR r IN SELECT * FROM ${defaultSchema}.menu_item_image WHERE menu_item_image.menu_item = update_menu_item_images.menu_item
        LOOP
          RETURN next r;
        END LOOP;
      END;
    $$ LANGUAGE plpgsql
  `))
  .then(() => knex.raw(`GRANT EXECUTE ON FUNCTION ${defaultSchema}.update_menu_item_images(INTEGER, INTEGER[]) TO restaurant_employee`))
  // restaurant
  .then(() => knex.schema.withSchema(defaultSchema).createTable('restaurant_image', table => {
    table.integer('restaurant')
      .unsigned()
      .index()
      .notNullable()
      .references('id')
      .inTable(`${defaultSchema}.restaurant`)
      .onDelete('CASCADE');
    table.integer('image')
      .unsigned()
      .index()
      .notNullable()
      .references('id')
      .inTable(`${defaultSchema}.image`)
      .onDelete('CASCADE');
    table.primary(['restaurant', 'image']);
  }))
  .then(() => knex.raw(`GRANT SELECT ON ${defaultSchema}.restaurant_image TO guest`))
  .then(() => knex.raw(`GRANT INSERT, DELETE ON ${defaultSchema}.restaurant_image TO restaurant_employee`))
  .then(() => knex.raw(`ALTER TABLE ${defaultSchema}.restaurant_image ENABLE ROW LEVEL SECURITY`))
  .then(() => knex.raw(`
    CREATE POLICY select_restaurant_image ON ${defaultSchema}.restaurant_image
      FOR SELECT USING (true)
  `))
  .then(() => knex.raw(`
    CREATE POLICY insert_restaurant_image ON ${defaultSchema}.restaurant_image
      FOR INSERT TO restaurant_employee
    WITH CHECK ((
      SELECT restaurant_role_rights.allow_upload_image FROM ${defaultSchema}.restaurant_account
        JOIN ${defaultSchema}.image ON image.id = restaurant_image.image AND image.restaurant = restaurant_account.restaurant
        JOIN ${defaultSchema}.restaurant_role_rights ON restaurant_role_rights.role = restaurant_account.role
      WHERE
        restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER
    ))
  `))
  .then(() => knex.raw(`
    CREATE POLICY delete_restaurant_image ON ${defaultSchema}.restaurant_image
      FOR DELETE TO restaurant_employee
    USING ((
      SELECT restaurant_role_rights.allow_delete_image FROM ${defaultSchema}.restaurant_account
        JOIN ${defaultSchema}.image ON image.id = restaurant_image.image AND image.restaurant = restaurant_account.restaurant
        JOIN ${defaultSchema}.restaurant_role_rights ON restaurant_role_rights.role = restaurant_account.role
      WHERE
        restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER
    ))
  `))
  .then(() => knex.raw(`
    CREATE OR REPLACE FUNCTION ${defaultSchema}.update_restaurant_images(restaurant INTEGER, images INTEGER[]) RETURNS SETOF ${defaultSchema}.restaurant_image
    AS $$
      DECLARE r record;
      BEGIN
        DELETE FROM ${defaultSchema}.restaurant_image WHERE restaurant_image.restaurant = update_restaurant_images.restaurant;
        INSERT INTO ${defaultSchema}.restaurant_image (restaurant, image) SELECT update_restaurant_images.restaurant AS restaurant, image FROM UNNEST(update_restaurant_images.images) AS image;
        FOR r IN SELECT * FROM ${defaultSchema}.restaurant_image WHERE restaurant_image.restaurant = update_restaurant_images.restaurant
        LOOP
          RETURN next r;
        END LOOP;
      END;
    $$ LANGUAGE plpgsql
  `))
  .then(() => knex.raw(`
    CREATE OR REPLACE FUNCTION ${defaultSchema}.restaurant_images_for_restaurant(restaurant ${defaultSchema}.restaurant) RETURNS SETOF ${defaultSchema}.image
    AS $$
      SELECT * FROM ${defaultSchema}.image WHERE
        COALESCE(image.restaurant, restaurant_images_for_restaurant.restaurant.id) = restaurant_images_for_restaurant.restaurant.id
    $$ LANGUAGE SQL STABLE
  `))
  .then(() => knex.raw(`GRANT EXECUTE ON FUNCTION ${defaultSchema}.restaurant_images_for_restaurant(${defaultSchema}.restaurant) TO guest`))
  .then(() => knex.raw(`GRANT EXECUTE ON FUNCTION ${defaultSchema}.update_restaurant_images(INTEGER, INTEGER[]) TO restaurant_employee`));

exports.down = knex => knex.raw(`DROP FUNCTION ${defaultSchema}.update_restaurant_images(INTEGER, INTEGER[])`)
  .then(() => knex.raw(`DROP FUNCTION ${defaultSchema}.update_menu_item_images(INTEGER, INTEGER[])`))
  .then(() => knex.raw(`DROP FUNCTION ${defaultSchema}.restaurant_images_for_restaurant(${defaultSchema}.restaurant)`))
  .then(() => knex.schema.withSchema(defaultSchema).dropTable('menu_item_image'))
  .then(() => knex.schema.withSchema(defaultSchema).dropTable('restaurant_image'))
  .then(() => knex.schema.withSchema(defaultSchema).dropTable('image'))
  .then(() => knex.schema.withSchema(defaultSchema).table('restaurant_role_rights', table => {
    table.dropColumn('allow_upload_image');
    table.dropColumn('allow_delete_image');
  }));
