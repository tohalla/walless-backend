/* eslint-disable import/no-commonjs */
const path = require('path');

const seedFile = require('knex-seed-file');

const options = {
  columnSeparator: ';',
  ignoreFirstLine: false
};

exports.seed = knex => true || knex('account_role').del()
    .then(() => knex('account').del())
    .then(() => knex('email').del())
    .then(() => knex('menu_item_category').del())
    .then(() => knex('menu_item_type').del())
    .then(() => knex('currency').del())
    .then(() => seedFile(knex, path.resolve('./seeds/currency.csv'), 'currency', [
      'code',
      'name',
      'symbol',
      'zero_decimal'
    ], options))
    .then(() => seedFile(knex, path.resolve('./seeds/email.csv'), 'email', [
      'id',
      'email',
      'name',
      'description'
    ], options))
    .then(() => seedFile(knex, path.resolve('./seeds/account.csv'), 'account', [
      'id',
      'first_name',
      'last_name',
      'email'
    ], options))
    .then(() => seedFile(knex, path.resolve('./seeds/account_role.csv'), 'account_role', [
      'id',
      'name',
      'description',
      'restaurant'
    ], options))
    .then(() => seedFile(knex, path.resolve('./seeds/restaurant_role_rights.csv'), 'restaurant_role_rights', [
      'id',
      'role',
      'restaurant',
      'allow_insert_promotion',
      'allow_update_promotion',
      'allow_delete_promotion',
      'allow_insert_menu',
      'allow_update_menu',
      'allow_delete_menu',
      'allow_insert_menu_item',
      'allow_update_menu_item',
      'allow_delete_menu_item',
      'allow_insert_serving_location',
      'allow_update_serving_location',
      'allow_delete_serving_location',
      'allow_update_restaurant',
      'allow_update_restaurant_roles',
      'allow_map_roles',
      'allow_upload_file',
      'allow_delete_file',
      'allow_view_users',
      'allow_view_user_roles',
      'allow_upload_image',
      'allow_delete_image',
      'allow_update_order'
    ], options))
    .then(() => seedFile(knex, path.resolve('./seeds/menu_item_type.csv'), 'menu_item_type', [
      'id',
      'name',
      'description'
    ], options))
    .then(() => seedFile(knex, path.resolve('./seeds/menu_item_category.csv'), 'menu_item_category', [
      'id',
      'name',
      'type',
      'description'
    ], options));
