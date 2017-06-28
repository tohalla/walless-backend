const {defaultSchema} = require('../db');

exports.up = knex => knex.raw(`GRANT SELECT ON ${defaultSchema}.menu_item_type TO guest`)
  .then(() => knex.raw(`GRANT SELECT ON ${defaultSchema}.menu_item_category TO guest`));

exports.down = knex => knex.raw(`REVOKE SELECT ON ${defaultSchema}.menu_item_type FROM guest`)
  .then(() => knex.raw(`REVOKE SELECT ON ${defaultSchema}.menu_item_category FROM guest`));
