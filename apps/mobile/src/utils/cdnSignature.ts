/**
 * ============================================================================
 * PURE JS/TS CRYPTOGRAPHIC SIGNATURE GENERATOR (Zero Native Dependencies)
 * ============================================================================
 * 
 * Works identically across: React Native (JSC / Hermes), iOS, Android, and Web.
 * Computes standard HMAC-SHA256 hashes to secure static JSON requests.
 */

// 1. Core SHA-256 Bitwise Functions
function sha256(ascii: string): string {
    function rightRotate(value: number, amount: number): number {
        return (value >>> amount) | (value << (32 - amount));
    }

    const mathPow = Math.pow;
    const maxWord = mathPow(2, 32);
    const result = [];
    const asciiLength = ascii.length * 8;

    const h0 = 0x6a09e667;
    const h1 = 0xbb67ae85;
    const h2 = 0x3c6ef372;
    const h3 = 0xa54ff53a;
    const h4 = 0x510e527f;
    const h5 = 0x9b05688c;
    const h6 = 0x1f83d9ab;
    const h7 = 0x5be0cd19;

    const primes: number[] = [];
    let isPrime = 1;
    for (let i = 2; primes.length < 64; i++) {
        isPrime = 1;
        for (let j = 2; j <= Math.sqrt(i); j++) {
            if (i % j === 0) {
                isPrime = 0;
                break;
            }
        }
        if (isPrime) {
            primes.push(i);
        }
    }

    const k = primes.map(p => (mathPow(p, 1 / 3) * maxWord) | 0);
    const hash = [h0, h1, h2, h3, h4, h5, h6, h7];

    let paddedMessage = ascii + String.fromCharCode(0x80);
    while (paddedMessage.length % 64 !== 56) {
        paddedMessage += String.fromCharCode(0);
    }
    const fullMessage = paddedMessage + String.fromCharCode(
        (asciiLength >>> 56) & 0xff,
        (asciiLength >>> 48) & 0xff,
        (asciiLength >>> 40) & 0xff,
        (asciiLength >>> 32) & 0xff,
        (asciiLength >>> 24) & 0xff,
        (asciiLength >>> 16) & 0xff,
        (asciiLength >>> 8) & 0xff,
        asciiLength & 0xff
    );

    for (let i = 0; i < fullMessage.length; i += 64) {
        const w = new Array(64);
        for (let j = 0; j < 16; j++) {
            w[j] = (fullMessage.charCodeAt(i + j * 4) << 24) |
                   (fullMessage.charCodeAt(i + j * 4 + 1) << 16) |
                   (fullMessage.charCodeAt(i + j * 4 + 2) << 8) |
                   (fullMessage.charCodeAt(i + j * 4 + 3));
        }
        for (let j = 16; j < 64; j++) {
            const s0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
            const s1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
            w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
        }

        let [a, b, c, d, e, f, g, h] = hash;

        for (let j = 0; j < 64; j++) {
            const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
            const ch = (e & f) ^ (~e & g);
            const temp1 = (h + S1 + ch + k[j] + w[j]) | 0;
            const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
            const maj = (a & b) ^ (a & c) ^ (b & c);
            const temp2 = (S0 + maj) | 0;

            h = g;
            g = f;
            f = e;
            e = (d + temp1) | 0;
            d = c;
            c = b;
            b = a;
            a = (temp1 + temp2) | 0;
        }

        hash[0] = (hash[0] + a) | 0;
        hash[1] = (hash[1] + b) | 0;
        hash[2] = (hash[2] + c) | 0;
        hash[3] = (hash[3] + d) | 0;
        hash[4] = (hash[4] + e) | 0;
        hash[5] = (hash[5] + f) | 0;
        hash[6] = (hash[6] + g) | 0;
        hash[7] = (hash[7] + h) | 0;
    }

    for (let i = 0; i < 8; i++) {
        const hex = (hash[i] >>> 0).toString(16);
        result.push('0'.repeat(8 - hex.length) + hex);
    }
    return result.join('');
}

// 2. Pure JS HMAC Implementation
export function hmacSHA256(message: string, key: string): string {
    let keyBytes = key;
    if (key.length > 64) {
        keyBytes = sha256(key);
    } else if (key.length < 64) {
        keyBytes = key + '\0'.repeat(64 - key.length);
    }

    let oKeyPad = '';
    let iKeyPad = '';
    for (let i = 0; i < 64; i++) {
        oKeyPad += String.fromCharCode(keyBytes.charCodeAt(i) ^ 0x5c);
        iKeyPad += String.fromCharCode(keyBytes.charCodeAt(i) ^ 0x36);
    }

    const innerHashHex = sha256(iKeyPad + message);
    
    // Convert hex string back to character binary string
    let innerHashBin = '';
    for (let i = 0; i < innerHashHex.length; i += 2) {
        innerHashBin += String.fromCharCode(parseInt(innerHashHex.substring(i, i + 2), 16));
    }

    return sha256(oKeyPad + innerHashBin);
}

// 3. Dynamic Request Signature generator
export function generateCdnSignature(pathname: string, secret: string = 'fresherflow_default_edge_secret'): { t: string; sig: string } {
    const t = Math.floor(Date.now() / 1000).toString();
    const message = `${pathname}:${t}`;
    const sig = hmacSHA256(message, secret);
    return { t, sig };
}
