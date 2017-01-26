/* eslint-disable import/no-commonjs */
exports.up = knex =>
  knex.raw(`
CREATE OR REPLACE FUNCTION update_menu_item_files(menu_item INTEGER, files INTEGER[]) RETURNS SETOF menu_item_file
AS $$
  DECLARE r record;
  BEGIN
    DELETE FROM menu_item_file WHERE menu_item_file.menu_item = update_menu_item_files.menu_item;
    INSERT INTO menu_item_file (menu_item, file) SELECT update_menu_item_files.menu_item AS menu_item, file FROM UNNEST(update_menu_item_files.files) AS file;
    FOR r IN SELECT * FROM menu_item_file WHERE menu_item_file.menu_item = update_menu_item_files.menu_item
    LOOP
      RETURN next r;
    END LOOP;
  END;
$$ LANGUAGE plpgsql
  `)
  .then(() => knex.raw('GRANT EXECUTE ON FUNCTION update_menu_item_files(INTEGER, INTEGER[]) TO authenticated_user'));

exports.down = knex =>
  knex.raw('DROP FUNCTION update_menu_item_files(INTEGER, INTEGER[])');
