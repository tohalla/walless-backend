/* eslint-disable import/no-commonjs, fp/no-mutation, better/explicit-return, fp/no-nil */
exports.up = knex => knex
  .raw('CREATE TYPE auth.jwt_claim AS (role text, account_id integer, exp integer)')
  .then(() => knex.raw(`
CREATE OR REPLACE FUNCTION auth.generate_validation_token() RETURNS TRIGGER
AS $$
  DECLARE token uuid;
  BEGIN
    IF EXISTS (SELECT login.id FROM auth.login WHERE login.id=NEW.id AND validated = TRUE) THEN
      RAISE unique_violation USING MESSAGE = 'login already exists and is validated';
    ELSE
      SELECT gen_random_uuid() INTO token;
      INSERT INTO auth.validation_token (token, account)
        VALUES (token, NEW.id);
      PERFORM pg_notify('validate', json_build_object(
        'token', token,
        'account_id', NEW.id
      )::text);
      RETURN NEW;
    END IF;
  END;
$$ LANGUAGE plpgsql
  `))
  .then(() => knex.raw(`
CREATE OR REPLACE FUNCTION auth.create_login() RETURNS TRIGGER
AS $$
  DECLARE token uuid;
  BEGIN
    IF EXISTS (SELECT login.id FROM auth.login WHERE login.id=NEW.id) THEN
      RAISE unique_violation USING MESSAGE = 'login already exists';
    ELSE
      INSERT INTO auth.login (id) VALUES (NEW.id);
      RETURN NEW;
    END IF;
  END;
$$ LANGUAGE plpgsql
  `))
  .then(() => knex.raw(`
CREATE OR REPLACE FUNCTION auth.encrypt_password() RETURNS TRIGGER
AS $$
  BEGIN
    IF NEW.password != OLD.password OR OLD.password IS NULL THEN
      IF NEW.password IS NULL THEN
        RAISE null_value_not_allowed USING MESSAGE = 'prompt password';
      END IF;
      NEW.password = crypt(NEW.password, gen_salt('bf'));
    END IF;
    RETURN NEW;
  END;
$$ LANGUAGE plpgsql
    `))
  .then(() => knex.raw(`
CREATE OR REPLACE FUNCTION auth.validation_token_exists(account_id integer, token text) RETURNS BOOLEAN
AS $$
  BEGIN
    RETURN EXISTS(SELECT FROM auth.validation_token WHERE account = account_id AND validation_token.token = validation_token_exists.token);
  END;
$$ LANGUAGE plpgsql
    `))
  .then(() => knex.raw(`
CREATE TRIGGER encrypt_password
  BEFORE UPDATE ON auth.login
    FOR EACH ROW EXECUTE PROCEDURE auth.encrypt_password();
  `))
  .then(() => knex.raw(`
CREATE TRIGGER create_login
  AFTER INSERT ON account
    FOR EACH ROW EXECUTE PROCEDURE auth.create_login();
  `))
  .then(() => knex.raw(`
CREATE TRIGGER generate_validation_token
  AFTER INSERT ON auth.login
    FOR EACH ROW EXECUTE PROCEDURE auth.generate_validation_token();
  `))
  .then(() => knex.raw(`
CREATE OR REPLACE FUNCTION auth.authenticate(id integer, password text) RETURNS auth.jwt_claim
AS $$
  DECLARE result auth.jwt_claim;
  BEGIN
    SELECT
      role,
      login.id AS account_id,
      extract(epoch from now())::integer + 3600 as exp
    FROM auth.login
      WHERE
        authenticate.id = login.id AND
        crypt(authenticate.password, login.password) = login.password
    INTO result;
    IF result IS null THEN
      RAISE invalid_password USING MESSAGE = 'invalid login information';
    END IF;
    RETURN result;
  END;
$$ LANGUAGE plpgsql
  `))
  .then(() => knex.raw(`
CREATE OR REPLACE FUNCTION auth.authenticate(email text, password text) RETURNS auth.jwt_claim
AS $$
  DECLARE result auth.jwt_claim;
  BEGIN
    SELECT
      login.role,
      login.id AS account_id,
      extract(epoch from now())::integer + 3600 as exp
    FROM auth.login
      JOIN account ON login.id = account.id
      JOIN email ON account.email = email.id AND authenticate.email = email.email
    WHERE
      crypt(authenticate.password, login.password) = login.password
    INTO result;
    IF result IS null THEN
      RAISE invalid_password USING MESSAGE = 'invalid login information';
    END IF;
    RETURN result;
  END;
$$ LANGUAGE plpgsql
  `))
  .then('GRANT EXECUTE ON FUNCTION login(integer, text) TO guest');

exports.down = knex =>
  knex.raw('DROP FUNCTION auth.authenticate(integer, text)')
  .then(() => knex.raw('DROP FUNCTION auth.authenticate(text, text)'))
  .then(() => knex.raw('DROP TRIGGER generate_validation_token ON auth.login'))
  .then(() => knex.raw('DROP TRIGGER encrypt_password ON auth.login'))
  .then(() => knex.raw('DROP TRIGGER create_login ON account'))
  .then(() => knex.raw('DROP FUNCTION auth.generate_validation_token()'))
  .then(() => knex.raw('DROP FUNCTION auth.validation_token_exists()'))
  .then(() => knex.raw('DROP FUNCTION auth.create_login()'))
  .then(() => knex.raw('DROP FUNCTION auth.encrypt_password()'))
  .then(() => knex.raw('DROP TYPE auth.jwt_claim'));
