/* eslint-disable import/no-commonjs */
exports.up = knex =>
  knex.raw('CREATE ROLE guest NOLOGIN')
    .then(() => knex.raw('CREATE ROLE authenticated_user NOLOGIN'))
    .then(() => knex.raw('GRANT guest TO authenticated_user'))
    .then(() => knex.raw('CREATE ROLE restaurant_owner NOLOGIN'))
    .then(() => knex.raw('GRANT authenticated_user TO restaurant_owner'))
    .then(() => knex.raw('CREATE ROLE moderator NOLOGIN'))
    .then(() => knex.raw('GRANT restaurant_owner TO moderator'))
    .then(() => knex.raw('CREATE ROLE admin NOLOGIN'))
    .then(() => knex.raw('GRANT moderator TO admin'));

exports.down = knex =>
  knex.raw('DROP ROLE admin')
  .then(() => knex.raw('DROP ROLE moderator'))
  .then(() => knex.raw('DROP ROLE restaurant_owner'))
  .then(() => knex.raw('DROP ROLE authenticated_user'))
  .then(() => knex.raw('DROP ROLE guest'));
