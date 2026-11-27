import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {randomBytes, pbkdf2Sync, createCipheriv} from 'node:crypto';
import readline from 'node:readline';
import {Writable} from 'node:stream';

async function readPassword() {
  if (!process.stdin.isTTY) {
    let text = '';
    for await (const chunk of process.stdin) text += chunk;
    return text.replace(/\r?\n$/, '');
  }
  process.stdout.write('Contraseña para cifrar la presentación: ');
  const silent = new Writable({write(_chunk, _encoding, callback) { callback(); }});
  const input = readline.createInterface({input: process.stdin, output: silent, terminal: true});
  const password = await new Promise(resolve => input.question('', resolve));
  input.close(); process.stdout.write('\n');
  return password;
}

const sourceDirectory = path.resolve(process.argv[2] || '');
const outputDirectory = path.resolve(process.argv[3] || '.');
if (!process.argv[2]) throw new Error('Uso: node encrypt.mjs CARPETA_PRIVADA [CARPETA_PUBLICA]');
const sourceSlides = JSON.parse(await fs.readFile(path.join(sourceDirectory, 'slides.json'), 'utf8'));
if (!Array.isArray(sourceSlides) || !sourceSlides.length || sourceSlides.length > 200) throw new Error('slides.json inválido');
let developmentDocument = null;
try {
  developmentDocument = JSON.parse(await fs.readFile(path.join(sourceDirectory, 'development.json'), 'utf8'));
  if (developmentDocument.version !== 1 || typeof developmentDocument.title !== 'string' || !Array.isArray(developmentDocument.slides) || !developmentDocument.slides.length || developmentDocument.slides.length > 80) throw new Error('development.json inválido');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  try {
    await fs.access(path.join(outputDirectory, 'development.bin'));
    throw new Error('Se requiere development.json en la carpeta privada para renovar la clave de ambos recorridos.');
  } catch (check) { if (check.code !== 'ENOENT') throw check; }
}
let password = await readPassword();
if (!password) throw new Error('La contraseña no puede estar vacía');
const salt = randomBytes(16);
const key = pbkdf2Sync(password, salt, 600000, 32, 'sha256');
password = null;
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'encrypted-presentation-'));
const slides = [];
const names = [];
async function encrypt(name, bytes) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from('CDTI-E2S|' + name, 'utf8'));
  const encoded = Buffer.concat([iv, cipher.update(bytes), cipher.final(), cipher.getAuthTag()]);
  await fs.writeFile(path.join(temporary, name), encoded);
  names.push(name);
}
try {
  for (let i = 0; i < sourceSlides.length; i++) {
    const original = sourceSlides[i];
    const sourcePath = path.resolve(sourceDirectory, original.src);
    if (!sourcePath.startsWith(sourceDirectory + path.sep)) throw new Error('Imagen fuera de la carpeta privada');
    const bytes = await fs.readFile(sourcePath);
    if (!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw new Error('Se requiere PNG');
    const name = 'slide-' + String(i + 1).padStart(2, '0') + '.bin';
    await encrypt(name, bytes);
    slides.push({src: name, title: String(original.title || 'Diapositiva ' + (i + 1)), text: String(original.text || '')});
  }
  await encrypt('manifest.bin', Buffer.from(JSON.stringify({version: 1, slides}), 'utf8'));
  if (developmentDocument) await encrypt('development.bin', Buffer.from(JSON.stringify(developmentDocument), 'utf8'));
  const config = {version: 1, kdf: 'PBKDF2', hash: 'SHA-256', iterations: 600000, salt: salt.toString('base64'), manifest: 'manifest.bin'};
  await fs.writeFile(path.join(temporary, 'vault.json'), JSON.stringify(config, null, 2) + '\n');
  names.push('vault.json');
  await fs.mkdir(outputDirectory, {recursive: true});
  for (const name of await fs.readdir(outputDirectory)) {
    if (/^slide-[0-9]{2,3}\.bin$/.test(name) && !names.includes(name)) await fs.unlink(path.join(outputDirectory, name));
  }
  for (const name of names) await fs.copyFile(path.join(temporary, name), path.join(outputDirectory, name));
  console.log(JSON.stringify({slides: slides.length, files: names.length, output: outputDirectory}));
} finally {
  key.fill(0);
  await fs.rm(temporary, {recursive: true, force: true});
}
