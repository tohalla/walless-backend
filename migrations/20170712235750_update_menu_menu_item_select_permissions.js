const {defaultSchema} = require('../db');

exports.up = knex => knex.raw(`
  CREATE POLICY select_menu_menu_items ON ${defaultSchema}.menu_menu_item
    FOR SELECT TO GUEST
  USING (true)`
);

exports.down = knex => knex.raw(`DROP POLICY select_menu_menu_items ON ${defaultSchema}`);
