const {defaultSchema} = require('../db');

exports.up = knex => knex.raw(`DROP POLICY access_own_email ON ${defaultSchema}.email`)
  .then(() => knex.schema.withSchema(defaultSchema).table('account', table => {
    table.string('email_new', 254);
  }))
  .then(() => knex.raw(`
    UPDATE ${defaultSchema}.account SET
      email_new = (SELECT email.email FROM ${defaultSchema}.email WHERE account.email = email.id)
  `))
  .then(() => knex.schema.withSchema(defaultSchema).table('account', table => {
    table.dropColumn('email');
  }))
  .then(() => knex.schema.withSchema(defaultSchema).table('account', table => {
    table.string('email_new', 254).notNullable().unique().alter();
    table.renameColumn('email_new', 'email');
  }))
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
          JOIN ${defaultSchema}.account ON login.id = account.id AND account.email = authenticate.email
        WHERE
          crypt(authenticate.password, login.password) = login.password
        INTO result;
        IF result IS null THEN
          UPDATE auth.login SET last_login_attempt = now() WHERE login.id = (
            SELECT account.id FROM ${defaultSchema}.account
              WHERE account.email = authenticate.email
          );
          RETURN null;
        END IF;
        UPDATE auth.login SET last_successful_login = now() WHERE login.id = (
            SELECT account.id FROM ${defaultSchema}.account
              WHERE account.email = authenticate.email
        );
        RETURN result;
      END;
    $$ LANGUAGE plpgsql
  `));

exports.down = knex => knex.schema.withSchema(defaultSchema).table('account', table => {
  table.dropColumn('email');
})
  .then(() => knex.schema.withSchema(defaultSchema).table('account', table => {
    table.integer('email').defaultTo(1);
  }))
  .then(() => knex.schema.withSchema(defaultSchema).table('account', table => {
    table.integer('email')
      .references('id').inTable(`${defaultSchema}.email`)
      .index()
      .unsigned()
      .notNullable()
      .comment('primary email address')
      .alter();
  }))
  .then(() => knex.raw(`
    CREATE POLICY access_own_email ON ${defaultSchema}.email
      FOR ALL TO authenticated_user
    USING (
      id = (
        SELECT account.email FROM ${defaultSchema}.account
          WHERE current_setting('jwt.claims.account_id')::INTEGER = account.id
      )
    )
    WITH CHECK (
      id = (
        SELECT account.email FROM ${defaultSchema}.account
          WHERE current_setting('jwt.claims.account_id')::INTEGER = account.id
      )
    )
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
  `));
