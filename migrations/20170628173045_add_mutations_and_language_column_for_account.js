const {defaultSchema} = require('../db');

exports.up = knex => knex.schema.withSchema(defaultSchema).table('account', table => {
  table
    .string('language', 5)
    .references('locale').inTable('translation.language')
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
        updated_at = now()
      WHERE
        m.id = account.id
      RETURNING *
    $$ LANGUAGE sql
  `));

exports.down = knex => knex.raw(`DROP FUNCTION ${defaultSchema}.update_account(${defaultSchema}.account)`)
  .then(() => knex.schema.withSchema(defaultSchema).table('account', table => {
    table.dropColumn('language');
  }));
