<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\File;

class DataExport extends Model
{
    protected $fillable = [
        'user_id',
        'token',
        'file_path',
        'status',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function hasDownloadFile(): bool
    {
        return is_string($this->file_path)
            && $this->file_path !== ''
            && File::exists(storage_path("app/{$this->file_path}"));
    }

    public function isDownloadReady(): bool
    {
        return $this->status === 'ready'
            && $this->expires_at?->isFuture() === true
            && $this->hasDownloadFile();
    }
}
