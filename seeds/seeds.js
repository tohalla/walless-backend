/* eslint-disable import/no-commonjs, fp/no-mutation, better/explicit-return, fp/no-nil */
const path = require('path');

const seedFile = require('knex-seed-file');

const options = {
  columnSeparator: ';',
  ignoreFirstLine: false
};

exports.seed = knex =>
  knex('vendor_email').del()
    .then(() => knex('user_role').del())
    .then(() => knex('user').del())
    .then(() => knex('vendor').del())
    .then(() => knex('email').del())
    .then(() => seedFile(knex, path.resolve('./seeds/email.csv'), 'email', [
      'id',
      'email',
      'name',
      'description'
    ], options))
    .then(() => seedFile(knex, path.resolve('./seeds/user.csv'), 'user', [
      'id',
      'first_name',
      'last_name',
      'email'
    ], options))
    .then(() => seedFile(knex, path.resolve('./seeds/user_role.csv'), 'user_role', [
      'id',
      'name',
      'description',
      'createdBy'
    ], options))
    .then(() => seedFile(knex, path.resolve('./seeds/vendor.csv'), 'vendor', [
      'id',
      'name'
    ], options))
    .then(() => seedFile(knex, path.resolve('./seeds/vendor_email.csv'), 'vendor_email', [
      'vendor',
      'email'
    ], options)
  );
