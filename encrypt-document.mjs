import fs from 'node:fs/promises';
import path from 'node:path';
import {randomBytes, pbkdf2Sync, createCipheriv, createDecipheriv} from 'node:crypto';
import readline from 'node:readline';
import {Writable} from 'node:stream';

if (!process.argv[2] || !process.argv[3]) throw new Error('Uso: node encrypt-document.mjs CARPETA_PUBLICA JSON_PRIVADO');
const directory = path.resolve(process.argv[2]);
const document = JSON.parse(await fs.readFile(path.resolve(process.argv[3]), 'utf8'));
if (document.version !== 1 || typeof document.title !== 'string' || !Array.isArray(document.slides) || !document.slides.length || document.slides.length > 80) throw new Error('Documento inválido');
const config = JSON.parse(await fs.readFile(path.join(directory, 'vault.json'), 'utf8'));
if (config.version !== 1 || config.kdf !== 'PBKDF2' || config.hash !== 'SHA-256' || config.iterations !== 600000 || config.manifest !== 'manifest.bin') throw new Error('Configuración de cifrado no admitida');
let password;
if (process.stdin.isTTY) {
  process.stdout.write('Contraseña de acceso: ');
  const silent = new Writable({write(_chunk, _encoding, done) { done(); }});
  const input = readline.createInterface({input:process.stdin, output:silent, terminal:true});
  password = await new Promise(resolve => input.question('', resolve));
  input.close(); process.stdout.write('\n');
} else {
  password = '';
  for await (const chunk of process.stdin) password += chunk;
  password = password.replace(/\r?\n$/, '');
}
if (!password) throw new Error('La contraseña no puede estar vacía');
const key = pbkdf2Sync(password, Buffer.from(config.salt, 'base64'), config.iterations, 32, 'sha256');
password = null;
const temporary = path.join(directory, '.development-' + randomBytes(8).toString('hex') + '.tmp');
try {
  const manifest = await fs.readFile(path.join(directory, config.manifest));
  const verify = createDecipheriv('aes-256-gcm', key, manifest.subarray(0, 12));
  verify.setAAD(Buffer.from('CDTI-E2S|' + config.manifest)); verify.setAuthTag(manifest.subarray(-16));
  const verified = JSON.parse(Buffer.concat([verify.update(manifest.subarray(12, -16)), verify.final()]).toString('utf8'));
  if (verified.version !== 1 || !Array.isArray(verified.slides)) throw new Error('Manifest inválido');
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from('CDTI-E2S|development.bin'));
  const blob = Buffer.concat([iv, cipher.update(Buffer.from(JSON.stringify(document))), cipher.final(), cipher.getAuthTag()]);
  await fs.writeFile(temporary, blob);
  await fs.rename(temporary, path.join(directory, 'development.bin'));
  console.log(JSON.stringify({file:'development.bin', slides:document.slides.length, bytes:blob.length}));
} finally {
  key.fill(0); await fs.rm(temporary, {force:true});
}
