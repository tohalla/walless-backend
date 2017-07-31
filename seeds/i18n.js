/* eslint-disable import/no-commonjs */
const path = require('path');

const seedFile = require('knex-seed-file');

const options = {
  columnSeparator: ';',
  ignoreFirstLine: false
};

exports.seed = knex =>
  knex('translation.translation').del()
    // .then(() => knex('translation.language').del())
    // .then(() => seedFile(knex, path.resolve('./seeds/translation/language.csv'), 'translation.language', [
    //   'locale',
    //   'name',
    //   'language_code',
    //   'language_short_code'
    // ], options))
    .then(() => seedFile(knex, path.resolve('./seeds/translation/en.csv'), 'translation.translation', [
      'language',
      'key',
      'translation'
    ], options));
