<?php

namespace App\Models;

use App\Enums\AuditCategory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use RuntimeException;

class AuditLog extends Model
{
    /**
     * Disable automatic timestamps — this table is append-only
     * and created_at is set manually in the creating event.
     */
    public $timestamps = false;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'action',
        'category',
        'auditable_type',
        'auditable_id',
        'metadata',
        'ip_address',
        'user_agent',
        'hash',
        'previous_hash',
        'hash_version',
        'created_at',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'hash_version' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    /**
     * Boot the model — enforce append-only behaviour.
     */
    protected static function booted(): void
    {
        // Automatically set created_at on new records.
        static::creating(function (AuditLog $log): void {
            if ($log->created_at === null) {
                $log->created_at = now();
            }
        });

        // Prevent any updates to existing records.
        static::updating(function (): never {
            throw new RuntimeException('Audit logs are immutable and cannot be updated.');
        });
    }

    // ── Immutability Guards ────────────────────────────────

    /**
     * Prevent deletion of audit log records.
     *
     * @throws RuntimeException
     */
    public function delete(): never
    {
        throw new RuntimeException('Audit logs are immutable and cannot be deleted.');
    }

    // ── Relationships ──────────────────────────────────────

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function auditable(): MorphTo
    {
        return $this->morphTo();
    }

    public function scopeSecurity(Builder $query): Builder
    {
        return $query->where('category', AuditCategory::Security->value);
    }

    public function scopeAudit(Builder $query): Builder
    {
        return $query->where('category', AuditCategory::Audit->value);
    }
}
