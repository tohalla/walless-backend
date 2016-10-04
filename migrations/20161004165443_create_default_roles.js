/* eslint-disable import/no-commonjs, fp/no-mutation, better/explicit-return, fp/no-nil */
exports.up = knex =>
  knex.raw('CREATE ROLE guest NOLOGIN')
    .then(() => knex.raw('CREATE ROLE authenticated_user NOLOGIN'))
    .then(() => knex.raw('GRANT guest TO authenticated_user'))
    .then(() => knex.raw('CREATE ROLE vendor NOLOGIN'))
    .then(() => knex.raw('GRANT authenticated_user TO vendor'))
    .then(() => knex.raw('CREATE ROLE moderator NOLOGIN'))
    .then(() => knex.raw('GRANT vendor TO moderator'))
    .then(() => knex.raw('CREATE ROLE admin NOLOGIN'))
    .then(() => knex.raw('GRANT moderator TO admin'));

exports.down = knex =>
  knex.raw('DROP ROLE admin')
  .then(() => knex.raw('DROP ROLE moderator'))
  .then(() => knex.raw('DROP ROLE vendor'))
  .then(() => knex.raw('DROP ROLE authenticated_user'))
  .then(() => knex.raw('DROP ROLE guest'));
