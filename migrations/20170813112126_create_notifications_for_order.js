const {defaultSchema} = require('../db');

exports.up = knex => knex.raw(`
  CREATE OR REPLACE FUNCTION ${defaultSchema}.notify_update() RETURNS trigger
  AS $$
  DECLARE r record;
  BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
      r = NEW;
    ELSE
      r = OLD;
    END IF;
    PERFORM pg_notify('order', JSON_BUILD_OBJECT('table', TG_TABLE_NAME, 'record', ROW_TO_JSON(r), 'operations', TG_OP)::TEXT);
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql
`)
  .then(() => knex.raw(`
    CREATE TRIGGER update_order_trigger AFTER UPDATE ON ${defaultSchema}.order
      FOR EACH ROW EXECUTE PROCEDURE ${defaultSchema}.notify_update()
  `))
  .then(() => knex.raw(`
    CREATE TRIGGER delete_order_trigger AFTER UPDATE ON ${defaultSchema}.order
      FOR EACH ROW EXECUTE PROCEDURE ${defaultSchema}.notify_update()
  `))
  .then(() => knex.raw(`
    CREATE TRIGGER insert_order_trigger AFTER UPDATE ON ${defaultSchema}.order
      FOR EACH ROW EXECUTE PROCEDURE ${defaultSchema}.notify_update()
  `));

exports.down = knex => knex.raw(`DROP TRIGGER update_order_trigger ON ${defaultSchema}.order`)
  .then(() => knex.raw(`DROP TRIGGER insert_order_trigger ON ${defaultSchema}.order`))
  .then(() => knex.raw(`DROP TRIGGER delete_order_trigger ON ${defaultSchema}.order`))
  .then(() => knex.raw(`DROP FUNCTION ${defaultSchema}.notify_update()`));
