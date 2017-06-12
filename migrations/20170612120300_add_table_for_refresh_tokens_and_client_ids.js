exports.up = knex => knex.schema.withSchema('auth').createTable('client', table => {
  table
    .string('id', 36)
    .primary()
    .defaultTo(knex.raw('gen_random_uuid()'));
  table.timestamp('created_at').notNullable().defaultTo('now()');
  table.string('refresh_token', 36);
  table.string('device', 64);
  table.integer('account')
    .references('id').inTable('auth.login')
    .onDelete('CASCADE');
})
  .then(() => knex.raw(`
    CREATE OR REPLACE FUNCTION auth.authenticate_with_refresh_token(client_id TEXT, refresh_token TEXT) RETURNS auth.jwt_claim
    AS $$
      DECLARE result auth.jwt_claim;
      BEGIN
        SELECT
          role,
          login.id AS account_id,
          extract(epoch from now())::integer + 3600 as exp
        FROM auth.client
        JOIN auth.login ON
          login.id = client.account
        WHERE
          client.id = authenticate_with_refresh_token.client_id AND
          client.refresh_token = authenticate_with_refresh_token.refresh_token
        INTO result;
        IF result IS null THEN
          RAISE invalid_password USING MESSAGE = 'invalid refresh token';
        END IF;
        RETURN result;
      END;
    $$ LANGUAGE plpgsql
  `))
  .then('GRANT EXECUTE ON FUNCTION auth.authenticate_with_refresh_token(TEXT, TEXT) TO guest');

exports.down = knex =>
  knex.raw('DROP FUNCTION auth.authenticate_with_refresh_token(TEXT, TEXT)')
    .then(() => knex.schema.withSchema('auth').dropTable('client'));
