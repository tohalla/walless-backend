import nodemailer from 'nodemailer';
import config from 'config';

const mail = config.get('mail');

export default nodemailer.createTransport(mail);
