import Io from 'socket.io';
import jwt from 'jsonwebtoken';
import {get} from 'lodash/fp';

import dbConfig from 'db';
import {defaultSchema} from 'db';
import {Client} from 'pg';


export default async (server) => {
  const client = new Client(dbConfig.pg);
  await client.connect();
  const io = new Io(server, {
    handlePreflightRequest: (req, res) => {
      res.writeHead(200, {
        'Access-Control-Allow-Headers': 'Content-Type, authorization, restaurant',
        'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' ?
          'https://management.walless.fi' : 'http://localhost:3000',
        'Access-Control-Allow-Credentials': true
      });
      res.end();
    }
  });
  const userNamespace = io.of('/user');
  const restaurantNamespace = io.of('/restaurant');

  try {
    client.query('LISTEN "order"');

    userNamespace.on('connection', async (socket) => {
      const {user} = await jwt.verify(
        get(['handshake', 'headers', 'authorization'])(socket),
        process.env.JWT_SECRET
      );
      if (!user) {
        throw Error({status: 401});
      }
      socket.join(user);
    });

    restaurantNamespace.on('connection', async (socket) => {
      const {user} = await jwt.verify(
        get(['handshake', 'headers', 'authorization'])(socket),
        process.env.JWT_SECRET
      );
      const restaurant = get(['handshake', 'headers', 'restaurant'])(socket);
      if (
        !user ||
        !restaurant ||
        !get(['rows', 0, 'is_employee'])(await client.query(`
          SELECT is_employee FROM ${defaultSchema}.restaurant_account
            JOIN ${defaultSchema}.restaurant_role_rights ON restaurant_role_rights.id = restaurant_account.role
          WHERE restaurant_account.restaurant = $2::INTEGER AND account = $1::INTEGER`,
          [user, restaurant]
        ))
      ) {
        throw Error({status: 401});
      }
      socket.join(restaurant);
    });

    client.on('notification', notification => {
      const {
        record,
        table,
        operations
      } = notification.payload && JSON.parse(notification.payload) || {};
      userNamespace
        .to(record.created_by)
        .emit('notification', {record, table, operations});
      if (record.restaurant) {
        restaurantNamespace
          .to(record.restaurant)
          .emit('notification', {record, table, operations});
      }
    });
  } catch (err) {}
};
