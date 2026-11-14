#!/usr/bin/env node
/**
 * Prints a bcryptjs hash for a password typed at the prompt, or piped on stdin.
 *
 * The password is never echoed, logged or written to disk, so the resulting hash
 * can be stored in ADMIN_PASSWORD_HASH instead of a plain-text ADMIN_PASSWORD.
 *
 *   npm run hash:admin
 *   printf '%s' 'my-password' | npm run hash:admin
 */
'use strict';

const readline = require('node:readline');
const bcrypt = require('bcryptjs');

const ROUNDS = Number(process.env.BCRYPT_ROUNDS || 10);

function finish(password) {
  if (!password) {
    console.error('[credvault] No password supplied. Nothing was hashed.');
    process.exit(1);
  }
  if (password.length < 12) {
    console.error(
      '[credvault] Note: passwords shorter than 12 characters are easier to guess than longer ones.',
    );
  }
  // Only the hash is printed; the password itself never leaves this process.
  console.log(bcrypt.hashSync(password, ROUNDS));
}

if (process.stdin.isTTY) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });
  // Swallow the echo so the typed password does not appear on screen.
  rl._writeToOutput = () => {};
  process.stdout.write('Administrator password (input hidden): ');
  rl.question('', (answer) => {
    rl.close();
    process.stdout.write('\n');
    finish(answer);
  });
} else {
  let data = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => {
    data += chunk;
  });
  process.stdin.on('end', () => finish(data.replace(/\r?\n$/, '')));
}
