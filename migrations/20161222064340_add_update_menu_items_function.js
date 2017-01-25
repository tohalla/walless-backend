/* eslint-disable import/no-commonjs */
exports.up = knex =>
  knex.raw(`
CREATE OR REPLACE FUNCTION update_menu_items(menu INTEGER, menu_items INTEGER[]) RETURNS SETOF menu_menu_item
AS $$
  DECLARE r record;
  BEGIN
    DELETE FROM menu_menu_item WHERE menu_menu_item.menu = update_menu_items.menu;
    INSERT INTO menu_menu_item (menu, menu_item) SELECT update_menu_items.menu AS menu, menu_item FROM UNNEST(update_menu_items.menu_items) AS menu_item;
    FOR r IN SELECT * FROM menu_menu_item WHERE menu_menu_item.menu = update_menu_items.menu
    LOOP
      RETURN next r;
    END LOOP;
  END;
$$ LANGUAGE plpgsql
  `)
  .then(() => knex.raw('GRANT EXECUTE ON FUNCTION update_menu_items(INTEGER, INTEGER[]) TO authenticated_user'));

exports.down = knex =>
  knex.raw('DROP FUNCTION update_menu_items(INTEGER, INTEGER[])');
