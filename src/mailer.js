import nodemailer from 'nodemailer';
import showdown from 'showdown';

import emailVerification from 'emailVerification.md';
import emailVerificationTxt from 'emailVerification.txt';

const converter = new showdown.Converter();

const transporter = process.env.NODE_ENV === 'production' ?
  nodemailer.createTransport(
    {
      sendmail: true,
      path: '/usr/sbin/sendmail',
      newline: 'unix'
    }
) : {
  sendMail: (...args) => console.log(args)
};

const wrapHtml = mail =>
`<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
</head>
  <body>
    ${mail}
  </body>
</html>`;

const compileMail = (mail, variables) =>
  mail.match(/{{([^}]*)}}/g).reduce(
    (prev, curr) =>
      prev.replace(curr, variables[curr.match(/{{([^}]*)}}/)[1].trim()] || ''),
    mail
  );

export const sendEmailVerification = (to, variables) => transporter.sendMail({
  subject: `Tervetuloa ${variables.firstName || ''}!`,
  html: wrapHtml(converter.makeHtml(compileMail(emailVerification, variables))),
  text: compileMail(emailVerificationTxt, variables),
  from: '"Walless" <walless@walless.fi>',
  to
});

export default transporter;
