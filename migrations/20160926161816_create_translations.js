/* eslint-disable import/no-commonjs */
exports.up = knex =>
  knex.raw('CREATE SCHEMA translation').then(() =>
    knex.schema.withSchema('translation').createTable('language', table => {
      table.string('locale', 5).primary();
      table.string('name', 128).notNullable();
      table.string('language_code', 3).comment('ISO 639-2 Code');
      table.string('language_short_code', 2).comment('ISO 639-1 Code');
    })
  )
  .then(() =>
    knex.schema.withSchema('translation').createTable('translation', table => {
      table.text('key').notNullable().comment('Translation key');
      table.text('translation').comment('Translation');
      table
        .string('language', 5)
        .references('locale').inTable('translation.language')
        .index();
      table.primary(['key', 'language']);
    })
  );

exports.down = knex =>
  knex.schema.withSchema('translation').dropTable('translation')
    .then(() => knex.schema.withSchema('translation').dropTable('language'))
    .then(() => knex.raw('DROP SCHEMA translation'));
