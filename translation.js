import express from 'express';

import {query} from './utilities/query';

export default express()
  .get('/', async (req, res, next) => {
    res.json(await query('SELECT * FROM translation.language'));
    return next();
  })
  .get('/:lang', async(req, res, next) => {
    res.json(
      (await query(
        'SELECT translation.key, translation.translation FROM translation.language JOIN translation.translation ON translation.language = locale WHERE locale = $1::text',
        [req.params.lang]
      ))
        .reduce((prev, curr) =>
          Object.assign({}, prev, {[curr.key]: curr.translation}), {}
        )
    );
    return next();
  });
