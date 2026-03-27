function rotateLeft(value: number, shift: number) {
    return (value << shift) | (value >>> (32 - shift));
}

function addUnsigned(x: number, y: number) {
    const x4 = x & 0x40000000;
    const y4 = y & 0x40000000;
    const x8 = x & 0x80000000;
    const y8 = y & 0x80000000;
    const result = (x & 0x3fffffff) + (y & 0x3fffffff);

    if (x4 & y4) {
        return result ^ 0x80000000 ^ x8 ^ y8;
    }

    if (x4 | y4) {
        if (result & 0x40000000) {
            return result ^ 0xc0000000 ^ x8 ^ y8;
        }

        return result ^ 0x40000000 ^ x8 ^ y8;
    }

    return result ^ x8 ^ y8;
}

function f(x: number, y: number, z: number) {
    return (x & y) | (~x & z);
}

function g(x: number, y: number, z: number) {
    return (x & z) | (y & ~z);
}

function h(x: number, y: number, z: number) {
    return x ^ y ^ z;
}

function i(x: number, y: number, z: number) {
    return y ^ (x | ~z);
}

function ff(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    return addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, f(b, c, d)), addUnsigned(x, ac)), s), b);
}

function gg(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    return addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, g(b, c, d)), addUnsigned(x, ac)), s), b);
}

function hh(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    return addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, h(b, c, d)), addUnsigned(x, ac)), s), b);
}

function ii(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    return addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, i(b, c, d)), addUnsigned(x, ac)), s), b);
}

function convertToWordArray(value: string) {
    const encodedValue = unescape(encodeURIComponent(value));
    const numberOfWordsTemp1 = encodedValue.length + 8;
    const numberOfWordsTemp2 =
        (numberOfWordsTemp1 - (numberOfWordsTemp1 % 64)) / 64;
    const numberOfWords = (numberOfWordsTemp2 + 1) * 16;
    const wordArray = new Array<number>(numberOfWords - 1);

    let byteCount = 0;

    while (byteCount < encodedValue.length) {
        const wordCount = (byteCount - (byteCount % 4)) / 4;
        const bytePosition = (byteCount % 4) * 8;
        wordArray[wordCount] =
            (wordArray[wordCount] ?? 0) |
            (encodedValue.charCodeAt(byteCount) << bytePosition);
        byteCount += 1;
    }

    const wordCount = (byteCount - (byteCount % 4)) / 4;
    const bytePosition = (byteCount % 4) * 8;
    wordArray[wordCount] = (wordArray[wordCount] ?? 0) | (0x80 << bytePosition);
    wordArray[numberOfWords - 2] = encodedValue.length << 3;
    wordArray[numberOfWords - 1] = encodedValue.length >>> 29;

    return wordArray;
}

function wordToHex(value: number) {
    let output = '';

    for (let count = 0; count <= 3; count += 1) {
        const byte = (value >>> (count * 8)) & 255;
        const hex = `0${byte.toString(16)}`;
        output += hex.slice(-2);
    }

    return output;
}

export function md5(value: string) {
    const x = convertToWordArray(value);
    let a = 0x67452301;
    let b = 0xefcdab89;
    let c = 0x98badcfe;
    let d = 0x10325476;

    for (let k = 0; k < x.length; k += 16) {
        const aa = a;
        const bb = b;
        const cc = c;
        const dd = d;

        a = ff(a, b, c, d, x[k + 0] ?? 0, 7, 0xd76aa478);
        d = ff(d, a, b, c, x[k + 1] ?? 0, 12, 0xe8c7b756);
        c = ff(c, d, a, b, x[k + 2] ?? 0, 17, 0x242070db);
        b = ff(b, c, d, a, x[k + 3] ?? 0, 22, 0xc1bdceee);
        a = ff(a, b, c, d, x[k + 4] ?? 0, 7, 0xf57c0faf);
        d = ff(d, a, b, c, x[k + 5] ?? 0, 12, 0x4787c62a);
        c = ff(c, d, a, b, x[k + 6] ?? 0, 17, 0xa8304613);
        b = ff(b, c, d, a, x[k + 7] ?? 0, 22, 0xfd469501);
        a = ff(a, b, c, d, x[k + 8] ?? 0, 7, 0x698098d8);
        d = ff(d, a, b, c, x[k + 9] ?? 0, 12, 0x8b44f7af);
        c = ff(c, d, a, b, x[k + 10] ?? 0, 17, 0xffff5bb1);
        b = ff(b, c, d, a, x[k + 11] ?? 0, 22, 0x895cd7be);
        a = ff(a, b, c, d, x[k + 12] ?? 0, 7, 0x6b901122);
        d = ff(d, a, b, c, x[k + 13] ?? 0, 12, 0xfd987193);
        c = ff(c, d, a, b, x[k + 14] ?? 0, 17, 0xa679438e);
        b = ff(b, c, d, a, x[k + 15] ?? 0, 22, 0x49b40821);

        a = gg(a, b, c, d, x[k + 1] ?? 0, 5, 0xf61e2562);
        d = gg(d, a, b, c, x[k + 6] ?? 0, 9, 0xc040b340);
        c = gg(c, d, a, b, x[k + 11] ?? 0, 14, 0x265e5a51);
        b = gg(b, c, d, a, x[k + 0] ?? 0, 20, 0xe9b6c7aa);
        a = gg(a, b, c, d, x[k + 5] ?? 0, 5, 0xd62f105d);
        d = gg(d, a, b, c, x[k + 10] ?? 0, 9, 0x02441453);
        c = gg(c, d, a, b, x[k + 15] ?? 0, 14, 0xd8a1e681);
        b = gg(b, c, d, a, x[k + 4] ?? 0, 20, 0xe7d3fbc8);
        a = gg(a, b, c, d, x[k + 9] ?? 0, 5, 0x21e1cde6);
        d = gg(d, a, b, c, x[k + 14] ?? 0, 9, 0xc33707d6);
        c = gg(c, d, a, b, x[k + 3] ?? 0, 14, 0xf4d50d87);
        b = gg(b, c, d, a, x[k + 8] ?? 0, 20, 0x455a14ed);
        a = gg(a, b, c, d, x[k + 13] ?? 0, 5, 0xa9e3e905);
        d = gg(d, a, b, c, x[k + 2] ?? 0, 9, 0xfcefa3f8);
        c = gg(c, d, a, b, x[k + 7] ?? 0, 14, 0x676f02d9);
        b = gg(b, c, d, a, x[k + 12] ?? 0, 20, 0x8d2a4c8a);

        a = hh(a, b, c, d, x[k + 5] ?? 0, 4, 0xfffa3942);
        d = hh(d, a, b, c, x[k + 8] ?? 0, 11, 0x8771f681);
        c = hh(c, d, a, b, x[k + 11] ?? 0, 16, 0x6d9d6122);
        b = hh(b, c, d, a, x[k + 14] ?? 0, 23, 0xfde5380c);
        a = hh(a, b, c, d, x[k + 1] ?? 0, 4, 0xa4beea44);
        d = hh(d, a, b, c, x[k + 4] ?? 0, 11, 0x4bdecfa9);
        c = hh(c, d, a, b, x[k + 7] ?? 0, 16, 0xf6bb4b60);
        b = hh(b, c, d, a, x[k + 10] ?? 0, 23, 0xbebfbc70);
        a = hh(a, b, c, d, x[k + 13] ?? 0, 4, 0x289b7ec6);
        d = hh(d, a, b, c, x[k + 0] ?? 0, 11, 0xeaa127fa);
        c = hh(c, d, a, b, x[k + 3] ?? 0, 16, 0xd4ef3085);
        b = hh(b, c, d, a, x[k + 6] ?? 0, 23, 0x04881d05);
        a = hh(a, b, c, d, x[k + 9] ?? 0, 4, 0xd9d4d039);
        d = hh(d, a, b, c, x[k + 12] ?? 0, 11, 0xe6db99e5);
        c = hh(c, d, a, b, x[k + 15] ?? 0, 16, 0x1fa27cf8);
        b = hh(b, c, d, a, x[k + 2] ?? 0, 23, 0xc4ac5665);

        a = ii(a, b, c, d, x[k + 0] ?? 0, 6, 0xf4292244);
        d = ii(d, a, b, c, x[k + 7] ?? 0, 10, 0x432aff97);
        c = ii(c, d, a, b, x[k + 14] ?? 0, 15, 0xab9423a7);
        b = ii(b, c, d, a, x[k + 5] ?? 0, 21, 0xfc93a039);
        a = ii(a, b, c, d, x[k + 12] ?? 0, 6, 0x655b59c3);
        d = ii(d, a, b, c, x[k + 3] ?? 0, 10, 0x8f0ccc92);
        c = ii(c, d, a, b, x[k + 10] ?? 0, 15, 0xffeff47d);
        b = ii(b, c, d, a, x[k + 1] ?? 0, 21, 0x85845dd1);
        a = ii(a, b, c, d, x[k + 8] ?? 0, 6, 0x6fa87e4f);
        d = ii(d, a, b, c, x[k + 15] ?? 0, 10, 0xfe2ce6e0);
        c = ii(c, d, a, b, x[k + 6] ?? 0, 15, 0xa3014314);
        b = ii(b, c, d, a, x[k + 13] ?? 0, 21, 0x4e0811a1);
        a = ii(a, b, c, d, x[k + 4] ?? 0, 6, 0xf7537e82);
        d = ii(d, a, b, c, x[k + 11] ?? 0, 10, 0xbd3af235);
        c = ii(c, d, a, b, x[k + 2] ?? 0, 15, 0x2ad7d2bb);
        b = ii(b, c, d, a, x[k + 9] ?? 0, 21, 0xeb86d391);

        a = addUnsigned(a, aa);
        b = addUnsigned(b, bb);
        c = addUnsigned(c, cc);
        d = addUnsigned(d, dd);
    }

    return `${wordToHex(a)}${wordToHex(b)}${wordToHex(c)}${wordToHex(d)}`;
}

export function buildGravatarUrl(email: string, size = 80) {
    const hash = md5(email.trim().toLowerCase());

    return `https://www.gravatar.com/avatar/${hash}?d=404&s=${size}`;
}
