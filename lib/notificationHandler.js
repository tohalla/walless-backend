import Io from 'socket.io';
import jwt from 'jsonwebtoken';
import {get} from 'lodash/fp';
import config from 'config';

import {defaultSchema} from '../db';
import pool from './pool';

const jwtSecret = config.get('jwtSecret');

export default async (server) => {
  const client = await pool.connect();
  const io = new Io(server, {
    handlePreflightRequest: (req, res) => {
      res.writeHead(200, {
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, restaurant',
        'Access-Control-Allow-Origin': 'http://localhost:3000',
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
      try {
        const {user} = await jwt.verify(
          get(['handshake', 'headers', 'authorization'])(socket),
          jwtSecret
        );
        if (!user) {
          throw Error({status: 401});
        }
        socket.join(user);
      } catch (error) {}
    });

    restaurantNamespace.on('connection', async (socket) => {
      try {
        const {user} = await jwt.verify(
          get(['handshake', 'headers', 'authorization'])(socket),
          jwtSecret
        );
        const restaurant = get(['handshake', 'headers', 'restaurant'])(socket);
        const {rows: [{is_employee: isEmployee}]}= await client.query(`
            SELECT is_employee FROM ${defaultSchema}.restaurant_account
              JOIN ${defaultSchema}.restaurant_role_rights ON restaurant_role_rights.id = restaurant_account.role
            WHERE restaurant_account.restaurant = $2::INTEGER AND account = $1::INTEGER
          `,
          [user, restaurant]
        );
        if (!user || !restaurant || !isEmployee) {
          throw Error({status: 401});
        }
        socket.join(restaurant);
      } catch (error) {}

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
    });
  } catch (error) {}
};
