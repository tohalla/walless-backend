
/* eslint-disable */
const connection = {
  host: 'localhost',
  database: 'mehut',
  port: 5432,
  user: 'postgres',
  password: 'postgres'
}

const pool = {
  min: 2,
  max: 10
}

const knex = {
  client: 'postgresql',
  connection,
  pool,
  migrations: {
    tableName: 'migration'
  }
};

module.exports = {
  development: knex,
  staging: knex,
  production: knex,
  pg: Object.assign({}, pool, connection)
};
