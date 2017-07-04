const {defaultSchema} = require('../db');

exports.up = knex => knex.schema.withSchema(defaultSchema).table('account', table => {
  table
    .date('date_of_birth')
    .defaultTo('now()')
    .notNull();
  table
    .string('language', 5)
    .references('locale').inTable('translation.language')
    .notNull()
    .defaultTo('en')
    .onDelete('SET NULL')
    .index();
})
  .then(() => knex.raw(`
    CREATE OR REPLACE FUNCTION ${defaultSchema}.update_account(account ${defaultSchema}.account) RETURNS ${defaultSchema}.account
    AS $$
      UPDATE ${defaultSchema}.account m SET
        first_name = COALESCE(account.first_name, m.first_name),
        last_name = COALESCE(account.last_name, m.last_name),
        email = COALESCE(account.email, m.email),
        language = COALESCE(account.language, m.language),
        date_of_birth = COALESCE(account.date_of_birth, m.date_of_birth),
        updated_at = now()
      WHERE
        m.id = account.id
      RETURNING *
    $$ LANGUAGE sql
  `))
  .then(() => knex.raw(`GRANT SELECT, UPDATE ON ${defaultSchema}.account TO authenticated_user`))
  .then(() => knex.raw(`GRANT EXECUTE ON FUNCTION ${defaultSchema}.update_account(${defaultSchema}.account) TO authenticated_user`));

exports.down = knex => knex.raw(`DROP FUNCTION ${defaultSchema}.update_account(${defaultSchema}.account)`)
  .then(() => knex.schema.withSchema(defaultSchema).table('account', table => {
    table.dropColumn('language');
    table.dropColumn('date_of_birth');
  }));
