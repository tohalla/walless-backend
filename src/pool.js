import Pool from 'pg-pool';

import dbConfig from 'db';

const pool = new Pool(dbConfig.pg);

export default pool;
