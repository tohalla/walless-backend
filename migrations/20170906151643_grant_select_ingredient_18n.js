const {defaultSchema} = require('../db');
exports.up = knex => knex.raw(`GRANT SELECT ON ${defaultSchema}.diet_i18n TO guest`);

exports.down = knex => knex.raw(`REVOKE SELECT ON ${defaultSchema}.diet_i18n FROM guest`);
