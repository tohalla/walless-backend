import Io from 'socket.io';
import {Client} from 'pg';
import jwt from 'jsonwebtoken';
import {get} from 'lodash/fp';
import config from 'config';

import dbConfig from './db';

const jwtSecret = config.get('jwtSecret');
const notificationClient = new Client(dbConfig.pg);
notificationClient.connect();
notificationClient.query('LISTEN "order"');

export default server => {
  const io = new Io(server);
  const userNamespace = io.of('/user');

  userNamespace.on('connection', async (socket) => {
    const {user} = await jwt.verify(
      get(['handshake', 'headers', 'token'])(socket),
      jwtSecret
    );
    socket.join(user);
  });
  notificationClient.on('notification', notification => {
    const {
      record,
      table,
      operations
    } = notification.payload && JSON.parse(notification.payload) || {};
    userNamespace
      .to(record.created_by)
      .emit('notification', {record, table, operations});
  });
};
