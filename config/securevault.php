<?php

return [
    /*
    |--------------------------------------------------------------------------
    | SecureVault Document Storage Configuration
    |--------------------------------------------------------------------------
    |
    | vault_path: Absolute path to the encrypted file storage.
    | max_upload_size: Maximum file size in bytes (default 10MB).
    | allowed_mimes: Allowed MIME types for uploaded documents.
    | trash_retention_days: Days to keep soft-deleted documents before purging.
    |
    */

    'vault_path' => storage_path('app/vault'),
    
    'max_upload_size' => 10 * 1024 * 1024, // 10 MB

    'allowed_mimes' => [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'image/png',
        'image/jpeg',
        'image/webp',
    ],

    'trash_retention_days' => 30,

    'password_expiry_days' => (int) env('PASSWORD_EXPIRY_DAYS', 90),

    'failed_login_warn' => (int) env('FAILED_LOGIN_WARN', 5),

    'failed_login_danger' => (int) env('FAILED_LOGIN_DANGER', 20),

    'storage_limit_bytes' => (int) env('STORAGE_LIMIT_BYTES', 1073741824),
];
