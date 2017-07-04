const {defaultSchema} = require('../db');

exports.up = knex =>
  knex.schema.withSchema(defaultSchema).createTable('restaurant_file', table => {
    table.integer('restaurant')
      .unsigned()
      .index()
      .notNullable()
      .references('id')
      .inTable(`${defaultSchema}.restaurant`)
      .onDelete('CASCADE');
    table.integer('file')
      .unsigned()
      .index()
      .notNullable()
      .references('id')
      .inTable(`${defaultSchema}.file`)
      .onDelete('CASCADE');
    table.primary(['restaurant', 'file']);
  })
    .then(() => knex.raw(`GRANT SELECT ON ${defaultSchema}.restaurant_file TO guest`))
    .then(() => knex.raw(`GRANT INSERT, DELETE ON ${defaultSchema}.restaurant_file TO authenticated_user`))
    .then(() => knex.raw(`ALTER TABLE ${defaultSchema}.restaurant_file ENABLE ROW LEVEL SECURITY`))
    .then(() => knex.raw(`
      CREATE POLICY select_restaurant_file ON ${defaultSchema}.restaurant_file
        FOR SELECT USING (true)
    `))
    .then(() => knex.raw(`
      CREATE POLICY insert_restaurant_file ON ${defaultSchema}.restaurant_file
        FOR INSERT TO authenticated_user
      WITH CHECK ((
        SELECT restaurant_role_rights.allow_upload_file FROM ${defaultSchema}.restaurant_account
          JOIN ${defaultSchema}.file ON file.id = restaurant_file.file AND file.restaurant = restaurant_account.restaurant
          JOIN ${defaultSchema}.restaurant_role_rights ON restaurant_role_rights.role = restaurant_account.role
        WHERE
          restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER
      ))
    `))
    .then(() => knex.raw(`
      CREATE POLICY delete_restaurant_file ON ${defaultSchema}.restaurant_file
        FOR DELETE TO authenticated_user
      USING ((
        SELECT restaurant_role_rights.allow_delete_file FROM ${defaultSchema}.restaurant_account
          JOIN ${defaultSchema}.file ON file.id = restaurant_file.file AND file.restaurant = restaurant_account.restaurant
          JOIN ${defaultSchema}.restaurant_role_rights ON restaurant_role_rights.role = restaurant_account.role
        WHERE
          restaurant_account.account = current_setting('jwt.claims.account_id')::INTEGER
      ))
    `))
    .then(() => knex.raw(`
      CREATE OR REPLACE FUNCTION ${defaultSchema}.update_restaurant_files(restaurant INTEGER, files INTEGER[]) RETURNS SETOF ${defaultSchema}.restaurant_file
      AS $$
        DECLARE r record;
        BEGIN
          DELETE FROM ${defaultSchema}.restaurant_file WHERE restaurant_file.restaurant = update_restaurant_files.restaurant;
          INSERT INTO ${defaultSchema}.restaurant_file (restaurant, file) SELECT update_restaurant_files.restaurant AS restaurant, file FROM UNNEST(update_restaurant_files.files) AS file;
          FOR r IN SELECT * FROM ${defaultSchema}.restaurant_file WHERE restaurant_file.restaurant = update_restaurant_files.restaurant
          LOOP
            RETURN next r;
          END LOOP;
        END;
      $$ LANGUAGE plpgsql
  `))
  .then(() => knex.raw(`GRANT EXECUTE ON FUNCTION ${defaultSchema}.update_restaurant_files(INTEGER, INTEGER[]) TO authenticated_user`));

exports.down = knex =>
  knex.raw(`DROP FUNCTION ${defaultSchema}.update_restaurant_files(INTEGER, INTEGER[])`)
  .then(() => knex.schema.withSchema(defaultSchema).dropTable('restaurant_file'));
