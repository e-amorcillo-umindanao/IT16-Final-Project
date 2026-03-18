<?php

namespace App\Services;

use RuntimeException;

class EncryptionService
{
    /**
     * Encrypt a file's content.
     *
     * @param string $sourcePath Path to the source file
     * @return array ['encrypted_content' => string, 'iv' => string, 'original_hash' => string]
     * @throws RuntimeException
     */
    public function encryptFile(string $sourcePath): array
    {
        if (!file_exists($sourcePath)) {
            throw new RuntimeException("Source file not found: {$sourcePath}");
        }

        $content = file_get_contents($sourcePath);
        $iv = openssl_random_pseudo_bytes(openssl_cipher_iv_length('aes-256-cbc'));
        
        $key = hash('sha256', config('app.key'), true);
        
        $encryptedContent = openssl_encrypt(
            $content,
            'aes-256-cbc',
            $key,
            OPENSSL_RAW_DATA,
            $iv
        );

        if ($encryptedContent === false) {
            throw new RuntimeException('Encryption failed.');
        }

        return [
            'encrypted_content' => base64_encode($encryptedContent),
            'iv' => base64_encode($iv),
            'original_hash' => hash('sha256', $content),
        ];
    }

    /**
     * Decrypt content using AES-256-CBC.
     *
     * @param string $encryptedContent Base64 encoded encrypted content
     * @param string $iv Base64 encoded IV
     * @return string Decrypted content
     * @throws RuntimeException
     */
    public function decryptFile(string $encryptedContent, string $iv): string
    {
        $encryptedData = base64_decode($encryptedContent);
        $ivData = base64_decode($iv);
        
        $key = hash('sha256', config('app.key'), true);

        $decryptedContent = openssl_decrypt(
            $encryptedData,
            'aes-256-cbc',
            $key,
            OPENSSL_RAW_DATA,
            $ivData
        );

        if ($decryptedContent === false) {
            throw new RuntimeException('Decryption failed.');
        }

        return $decryptedContent;
    }

    /**
     * Verify the integrity of decrypted content against a stored hash.
     *
     * @param string $decryptedContent
     * @param string $storedHash
     * @return bool
     */
    public function verifyIntegrity(string $decryptedContent, string $storedHash): bool
    {
        return hash_equals(hash('sha256', $decryptedContent), $storedHash);
    }
}
