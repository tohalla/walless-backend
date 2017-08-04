const {defaultSchema} = require('../db');
exports.up = knex =>
  knex.schema.withSchema(defaultSchema).createTable('diet_i18n', table => {
    table
      .string('language', 5)
      .references('locale').inTable('translation.language')
      .index();
    table
      .integer('diet')
      .unsigned()
      .references('id').inTable(`${defaultSchema}.diet`)
      .onDelete('CASCADE');
    table.string('name', 255).notNullable();
    table.string('abbreviation', 8);
    table.text('description');
    table.primary(['language', 'diet']);
  })
    .then(() => knex.schema.withSchema(defaultSchema).table('diet', table => {
      table.dropColumn('name');
      table.dropColumn('description');
      table.string('color', 7);
    }))
    .then(() => knex.raw(`
      ALTER TABLE ${defaultSchema}.diet ADD CONSTRAINT valid_color
        CHECK (color IS NULL OR color ~* '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$')
    `))
    .then(() => knex.raw(`GRANT SELECT ON ${defaultSchema}.diet_i18n TO guest`));

exports.down = knex => knex.raw(`ALTER TABLE ${defaultSchema}.diet DROP CONSTRAINT valid_color`)
  .then(() => knex.schema.withSchema(defaultSchema).table('diet', table => {
    table.string('name', 255);
    table.text('description');
    table.dropColumn('color');
  }))
  .then(() => knex.schema.withSchema(defaultSchema).dropTable('diet_i18n'));
