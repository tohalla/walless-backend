/* eslint-disable import/no-commonjs, fp/no-mutation, better/explicit-return, fp/no-nil */
const path = require('path');

const seedFile = require('knex-seed-file');

const options = {
  columnSeparator: ';',
  ignoreFirstLine: false
};

exports.seed = knex => knex('account_role').del()
    .then(() => knex('account').del())
    .then(() => knex('email').del())
    .then(() => knex('menu_item_category').del())
    .then(() => knex('menu_item_type').del())
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
      'allow_change_restaurant_description',
      'allow_change_restaurant_name',
      'allow_update_restaurant_roles',
      'allow_map_roles'
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
