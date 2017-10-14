import nodemailer from 'nodemailer';

export default nodemailer.createTransport({
  sendmail: true,
  path: '/usr/sbin/sendmail',
  newline: 'unix'
});
