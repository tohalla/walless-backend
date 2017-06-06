const {defaultSchema} = require('../db');

exports.up = knex => knex.raw(`CREATE SCHEMA ${defaultSchema}`)
  .then(() => knex.raw(`ALTER FUNCTION link_restaurant_owner() SET SCHEMA ${defaultSchema}`))
  .then(() => knex.raw(`DROP TRIGGER create_login on account`))
  .then(() => knex.raw(`ALTER TABLE account SET SCHEMA ${defaultSchema}`))
  .then(() => knex.raw(`
    CREATE OR REPLACE FUNCTION get_active_account() RETURNS ${defaultSchema}.account
    AS $$
      SELECT * FROM ${defaultSchema}.account
        WHERE account.id = current_setting('jwt.claims.account_id')::INTEGER
    $$ LANGUAGE sql stable
  `))
  .then(() => knex.raw(`ALTER FUNCTION get_active_account() SET SCHEMA ${defaultSchema}`))
  .then(() => knex.raw(`
    CREATE OR REPLACE FUNCTION auth.authenticate(email TEXT, password TEXT) RETURNS auth.jwt_claim
    AS $$
      DECLARE result auth.jwt_claim;
      BEGIN
        SELECT
          login.role,
          login.id AS account_id,
          extract(epoch from now())::integer + 3600 as exp
        FROM auth.login
          JOIN ${defaultSchema}.account ON login.id = account.id
          JOIN ${defaultSchema}.email ON account.email = email.id AND authenticate.email = email.email
        WHERE
          crypt(authenticate.password, login.password) = login.password
        INTO result;
        IF result IS null THEN
          UPDATE auth.login SET last_login_attempt = now() WHERE login.id = (
            SELECT account.id FROM ${defaultSchema}.account
              JOIN ${defaultSchema}.email ON account.email = email.id AND authenticate.email = email.email
          );
          RETURN null;
        END IF;
        UPDATE auth.login SET last_successful_login = now() WHERE login.id = (
            SELECT account.id FROM ${defaultSchema}.account
              JOIN ${defaultSchema}.email ON account.email = email.id AND authenticate.email = email.email
        );
        RETURN result;
      END;
    $$ LANGUAGE plpgsql
  `))
  .then(() => knex.raw(`
    CREATE TRIGGER create_login
      AFTER INSERT ON ${defaultSchema}.account
        FOR EACH ROW EXECUTE PROCEDURE auth.create_login();
  `))
  .then(() => knex.raw(`ALTER TABLE account_role SET SCHEMA ${defaultSchema}`))
  .then(() => knex.raw(`ALTER TABLE email SET SCHEMA ${defaultSchema}`))
  .then(() => knex.raw(`ALTER TABLE file SET SCHEMA ${defaultSchema}`))
  .then(() => knex.raw(`ALTER TABLE location SET SCHEMA ${defaultSchema}`))
  .then(() => knex.raw(`ALTER TABLE menu SET SCHEMA ${defaultSchema}`))
  .then(() => knex.raw(`ALTER TABLE menu_item SET SCHEMA ${defaultSchema}`))
  .then(() => knex.raw(`ALTER TABLE menu_item_category SET SCHEMA ${defaultSchema}`))
  .then(() => knex.raw(`ALTER TABLE menu_item_file SET SCHEMA ${defaultSchema}`))
  .then(() => knex.raw(`ALTER TABLE menu_item_type SET SCHEMA ${defaultSchema}`))
  .then(() => knex.raw(`ALTER TABLE menu_menu_item SET SCHEMA ${defaultSchema}`))
  .then(() => knex.raw(`ALTER TABLE restaurant SET SCHEMA ${defaultSchema}`))
  .then(() => knex.raw(`ALTER TABLE restaurant_account SET SCHEMA ${defaultSchema}`))
  .then(() => knex.raw(`ALTER TABLE restaurant_email SET SCHEMA ${defaultSchema}`))
  .then(() => knex.raw(`ALTER TABLE restaurant_role_rights SET SCHEMA ${defaultSchema}`))
  .then(() => knex.raw(`ALTER TABLE serving_location SET SCHEMA ${defaultSchema}`))
  .then(() => knex.raw(`
    CREATE OR REPLACE FUNCTION restaurant_account_roles_for_restaurant(restaurant ${defaultSchema}.restaurant) RETURNS SETOF ${defaultSchema}.account_role
    AS $$
      SELECT * FROM ${defaultSchema}.account_role WHERE
        COALESCE(account_role.restaurant, restaurant_account_roles_for_restaurant.restaurant.id) = restaurant_account_roles_for_restaurant.restaurant.id
    $$ LANGUAGE SQL STABLE
  `))
  .then(() => knex.raw(`
    CREATE OR REPLACE FUNCTION restaurant_files_for_restaurant(restaurant ${defaultSchema}.restaurant) RETURNS SETOF ${defaultSchema}.file
    AS $$
      SELECT * FROM ${defaultSchema}.file WHERE
        COALESCE(file.restaurant, restaurant_files_for_restaurant.restaurant.id) = restaurant_files_for_restaurant.restaurant.id
    $$ LANGUAGE SQL STABLE
  `))
  .then(() => knex.raw(`
    ALTER FUNCTION restaurant_account_roles_for_restaurant(${defaultSchema}.restaurant) SET SCHEMA ${defaultSchema}
  `))
  .then(() => knex.raw(`
    ALTER FUNCTION restaurant_files_for_restaurant(${defaultSchema}.restaurant) SET SCHEMA ${defaultSchema}
  `))
   .then(() => knex.raw(`
    CREATE OR REPLACE FUNCTION update_menu_items(menu INTEGER, menu_items INTEGER[]) RETURNS SETOF ${defaultSchema}.menu_menu_item
    AS $$
      DECLARE r record;
      BEGIN
        DELETE FROM ${defaultSchema}.menu_menu_item WHERE menu_menu_item.menu = update_menu_items.menu;
        INSERT INTO ${defaultSchema}.menu_menu_item (menu, menu_item) SELECT update_menu_items.menu AS menu, menu_item FROM UNNEST(update_menu_items.menu_items) AS menu_item;
        FOR r IN SELECT * FROM ${defaultSchema}.menu_menu_item WHERE menu_menu_item.menu = update_menu_items.menu
        LOOP
          RETURN next r;
        END LOOP;
      END;
    $$ LANGUAGE plpgsql
  `))
  .then(() => knex.raw(`
    ALTER FUNCTION update_menu_items(INTEGER, INTEGER[]) SET SCHEMA ${defaultSchema}
  `))
  .then(() => knex.raw(`
    CREATE OR REPLACE FUNCTION update_menu_item_files(menu_item INTEGER, files INTEGER[]) RETURNS SETOF ${defaultSchema}.menu_item_file
    AS $$
      DECLARE r record;
      BEGIN
        DELETE FROM ${defaultSchema}.menu_item_file WHERE menu_item_file.menu_item = update_menu_item_files.menu_item;
        INSERT INTO ${defaultSchema}.menu_item_file (menu_item, file) SELECT update_menu_item_files.menu_item AS menu_item, file FROM UNNEST(update_menu_item_files.files) AS file;
        FOR r IN SELECT * FROM ${defaultSchema}.menu_item_file WHERE menu_item_file.menu_item = update_menu_item_files.menu_item
        LOOP
          RETURN next r;
        END LOOP;
      END;
    $$ LANGUAGE plpgsql
  `))
  .then(() => knex.raw(`
    ALTER FUNCTION update_menu_item_files(INTEGER, INTEGER[]) SET SCHEMA ${defaultSchema}
  `))
  .then(() => knex.raw(`GRANT USAGE ON SCHEMA ${defaultSchema} TO guest`));

exports.down = knex => knex.raw(`DROP TRIGGER create_login on ${defaultSchema}.account`)
  .then(() => knex.raw(`ALTER TABLE ${defaultSchema}.account SET SCHEMA public`))
  .then(() => knex.raw(`
    CREATE TRIGGER create_login
      AFTER INSERT ON account
        FOR EACH ROW EXECUTE PROCEDURE auth.create_login();
  `))
  .then(() => knex.raw(`ALTER TABLE ${defaultSchema}.account_role SET SCHEMA public`))
  .then(() => knex.raw(`ALTER TABLE ${defaultSchema}.email SET SCHEMA public`))
  .then(() => knex.raw(`ALTER TABLE ${defaultSchema}.file SET SCHEMA public`))
  .then(() => knex.raw(`ALTER TABLE ${defaultSchema}.location SET SCHEMA public`))
  .then(() => knex.raw(`ALTER TABLE ${defaultSchema}.menu SET SCHEMA public`))
  .then(() => knex.raw(`ALTER TABLE ${defaultSchema}.menu_item SET SCHEMA public`))
  .then(() => knex.raw(`ALTER TABLE ${defaultSchema}.menu_item_category SET SCHEMA public`))
  .then(() => knex.raw(`ALTER TABLE ${defaultSchema}.menu_item_file SET SCHEMA public`))
  .then(() => knex.raw(`ALTER TABLE ${defaultSchema}.menu_item_type SET SCHEMA public`))
  .then(() => knex.raw(`ALTER TABLE ${defaultSchema}.menu_menu_item SET SCHEMA public`))
  .then(() => knex.raw(`ALTER TABLE ${defaultSchema}.restaurant SET SCHEMA public`))
  .then(() => knex.raw(`ALTER TABLE ${defaultSchema}.restaurant_account SET SCHEMA public`))
  .then(() => knex.raw(`ALTER TABLE ${defaultSchema}.restaurant_email SET SCHEMA public`))
  .then(() => knex.raw(`ALTER TABLE ${defaultSchema}.restaurant_role_rights SET SCHEMA public`))
  .then(() => knex.raw(`ALTER TABLE ${defaultSchema}.serving_location SET SCHEMA public`))
  .then(() => knex.raw(`
    ALTER FUNCTION ${defaultSchema}.update_menu_items(INTEGER, INTEGER[]) SET SCHEMA public
  `))
  .then(() => knex.raw(`
    ALTER FUNCTION ${defaultSchema}.update_menu_item_files(INTEGER, INTEGER[]) SET SCHEMA public
  `))
   .then(() => knex.raw(`
    CREATE OR REPLACE FUNCTION update_menu_items(menu INTEGER, menu_items INTEGER[]) RETURNS SETOF menu_menu_item
    AS $$
      DECLARE r record;
      BEGIN
        DELETE FROM menu_menu_item WHERE menu_menu_item.menu = update_menu_items.menu;
        INSERT INTO menu_menu_item (menu, menu_item) SELECT update_menu_items.menu AS menu, menu_item FROM UNNEST(update_menu_items.menu_items) AS menu_item;
        FOR r IN SELECT * FROM menu_menu_item WHERE menu_menu_item.menu = update_menu_items.menu
        LOOP
          RETURN next r;
        END LOOP;
      END;
    $$ LANGUAGE plpgsql
  `))
  .then(() => knex.raw(`
    CREATE OR REPLACE FUNCTION update_menu_item_files(menu_item INTEGER, files INTEGER[]) RETURNS SETOF menu_item_file
    AS $$
      DECLARE r record;
      BEGIN
        DELETE FROM menu_item_file WHERE menu_item_file.menu_item = update_menu_item_files.menu_item;
        INSERT INTO menu_item_file (menu_item, file) SELECT update_menu_item_files.menu_item AS menu_item, file FROM UNNEST(update_menu_item_files.files) AS file;
        FOR r IN SELECT * FROM menu_item_file WHERE menu_item_file.menu_item = update_menu_item_files.menu_item
        LOOP
          RETURN next r;
        END LOOP;
      END;
    $$ LANGUAGE plpgsql
  `))
  .then(() => knex.raw(`ALTER FUNCTION ${defaultSchema}.link_restaurant_owner() SET SCHEMA public`))
  .then(() => knex.raw(`
    ALTER FUNCTION ${defaultSchema}.restaurant_account_roles_for_restaurant(restaurant) SET SCHEMA public
  `))
  .then(() => knex.raw(`
    ALTER FUNCTION ${defaultSchema}.restaurant_files_for_restaurant(restaurant) SET SCHEMA public
  `))
  .then(() => knex.raw(`
    CREATE OR REPLACE FUNCTION restaurant_account_roles_for_restaurant(restaurant restaurant) RETURNS SETOF account_role
    AS $$
      SELECT * FROM account_role WHERE
        COALESCE(account_role.restaurant, restaurant_account_roles_for_restaurant.restaurant.id) = restaurant_account_roles_for_restaurant.restaurant.id
    $$ LANGUAGE SQL STABLE
  `))
  .then(() => knex.raw(`
    CREATE OR REPLACE FUNCTION restaurant_files_for_restaurant(restaurant restaurant) RETURNS SETOF file
    AS $$
      SELECT * FROM file WHERE
        COALESCE(file.restaurant, restaurant_files_for_restaurant.restaurant.id) = restaurant_files_for_restaurant.restaurant.id
    $$ LANGUAGE SQL STABLE
  `))
  .then(() => knex.raw(`
    CREATE OR REPLACE FUNCTION auth.authenticate(email TEXT, password TEXT) RETURNS auth.jwt_claim
    AS $$
      DECLARE result auth.jwt_claim;
      BEGIN
        SELECT
          login.role,
          login.id AS account_id,
          extract(epoch from now())::integer + 3600 as exp
        FROM auth.login
          JOIN account ON login.id = account.id
          JOIN email ON account.email = email.id AND authenticate.email = email.email
        WHERE
          crypt(authenticate.password, login.password) = login.password
        INTO result;
        IF result IS null THEN
          UPDATE auth.login SET last_login_attempt = now() WHERE login.id = (
            SELECT account.id FROM account
              JOIN email ON account.email = email.id AND authenticate.email = email.email
          );
          RETURN null;
        END IF;
        UPDATE auth.login SET last_successful_login = now() WHERE login.id = (
            SELECT account.id FROM account
              JOIN email ON account.email = email.id AND authenticate.email = email.email
        );
        RETURN result;
      END;
    $$ LANGUAGE plpgsql
  `))
  .then(() => knex.raw(`ALTER FUNCTION ${defaultSchema}.get_active_account() SET SCHEMA public`))
  .then(() => knex.raw(`
    CREATE OR REPLACE FUNCTION get_active_account() RETURNS account
    AS $$
      SELECT * FROM account
        WHERE account.id = current_setting('jwt.claims.account_id')::INTEGER
    $$ LANGUAGE sql stable
  `))
  .then(() => knex.raw(`DROP SCHEMA ${defaultSchema}`));
