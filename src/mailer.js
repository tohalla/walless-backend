import nodemailer from 'nodemailer';

export default nodemailer.createTransport({
  host: 'localhost',
  port: 465,
  secure: true
});
