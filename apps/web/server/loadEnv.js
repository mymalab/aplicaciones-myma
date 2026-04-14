import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ENV_FILES = [join(__dirname, '..', '.env.local'), join(__dirname, '..', '.env')];

const stripWrappingQuotes = (value) => {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
};

const parseEnvLine = (line) => {
  const trimmedLine = line.trim();
  if (!trimmedLine || trimmedLine.startsWith('#')) {
    return null;
  }

  const separatorIndex = trimmedLine.indexOf('=');
  if (separatorIndex <= 0) {
    return null;
  }

  const key = trimmedLine.slice(0, separatorIndex).trim();
  const rawValue = trimmedLine.slice(separatorIndex + 1).trim();

  if (!key) {
    return null;
  }

  return {
    key,
    value: stripWrappingQuotes(rawValue),
  };
};

for (const envFilePath of ENV_FILES) {
  if (!existsSync(envFilePath)) {
    continue;
  }

  const fileContents = readFileSync(envFilePath, 'utf-8');
  for (const line of fileContents.split(/\r?\n/g)) {
    const parsedLine = parseEnvLine(line);
    if (!parsedLine) {
      continue;
    }

    if (typeof process.env[parsedLine.key] === 'undefined') {
      process.env[parsedLine.key] = parsedLine.value;
    }
  }
}
