import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

/**
 * 환경변수 TOKEN_ENCRYPTION_KEY를 32바이트 AES 키로 변환
 * 키는 64자리 HEX 문자열이어야 합니다. (openssl rand -hex 32)
 */
function getKey(): Buffer {
  const hex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!hex || hex.length < 64) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be a 64-character hex string. Generate with: openssl rand -hex 32');
  }
  return Buffer.from(hex.slice(0, 64), 'hex');
}

/**
 * AES-256-GCM 암호화
 * 반환 형식: "enc:<iv_hex>:<tag_hex>:<ciphertext_hex>"
 */
export function encrypt(plaintext: string | null | undefined): string | null | undefined {
  if (!plaintext) return plaintext;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * AES-256-GCM 복호화
 * "enc:" 접두사가 없으면 기존 평문 그대로 반환 (하위 호환)
 */
export function decrypt(ciphertext: string | null | undefined): string | null | undefined {
  if (!ciphertext) return ciphertext;
  if (!ciphertext.startsWith('enc:')) return ciphertext; // 기존 평문 데이터 호환
  const parts = ciphertext.slice(4).split(':');
  if (parts.length !== 3) return ciphertext;
  try {
    const [ivHex, tagHex, encHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const encryptedBuf = Buffer.from(encHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(tag);
    return decipher.update(encryptedBuf).toString('utf8') + decipher.final('utf8');
  } catch {
    return ciphertext;
  }
}
