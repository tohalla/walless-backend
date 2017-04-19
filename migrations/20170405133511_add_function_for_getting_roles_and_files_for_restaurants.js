exports.up = knex => knex.raw(`
  CREATE OR REPLACE FUNCTION restaurant_account_roles_for_restaurant(restaurant restaurant) RETURNS SETOF account_role
  AS $$
    SELECT * FROM account_role WHERE
      COALESCE(account_role.restaurant, restaurant_account_roles_for_restaurant.restaurant.id) = restaurant_account_roles_for_restaurant.restaurant.id
  $$ LANGUAGE SQL STABLE
`)
  .then(() => knex.raw(`
    CREATE OR REPLACE FUNCTION restaurant_files_for_restaurant(restaurant restaurant) RETURNS SETOF file
    AS $$
      SELECT * FROM file WHERE
        COALESCE(file.restaurant, restaurant_files_for_restaurant.restaurant.id) = restaurant_files_for_restaurant.restaurant.id
    $$ LANGUAGE SQL STABLE
  `));

exports.down = knex =>
  knex.raw('DROP FUNCTION public.restaurant_account_roles_for_restaurant(restaurant restaurant) CASCADE')
  .then(() => knex.raw('DROP function public.restaurant_files_for_restaurant(restaurant restaurant) CASCADE'));
