<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasRoles, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'two_factor_enabled',
        'failed_login_attempts',
        'locked_until',
        'last_login_at',
        'last_login_ip',
        'last_login_location',
        'is_active',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array<int, string>
     */
    protected $appends = [
        'avatar_url',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_secret',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_secret' => 'encrypted',
            'two_factor_enabled' => 'boolean',
            'is_active' => 'boolean',
            'locked_until' => 'datetime',
            'last_login_at' => 'datetime',
        ];
    }

    // ── Relationships ──────────────────────────────────────

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }

    public function sharedDocuments(): HasManyThrough
    {
        return $this->hasManyThrough(
            Document::class,
            DocumentShare::class,
            'shared_with_id', // FK on document_shares
            'id',             // FK on documents
            'id',             // LK on users
            'document_id'     // LK on document_shares
        );
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class);
    }

    // ── Lockout Helpers ────────────────────────────────────

    /**
     * Check if the user account is currently locked out.
     */
    public function isLockedOut(): bool
    {
        return $this->locked_until !== null && $this->locked_until->isFuture();
    }

    /**
     * Increment the failed login attempts counter.
     */
    public function incrementFailedLogins(): void
    {
        $this->increment('failed_login_attempts');
    }

    /**
     * Reset the failed login attempts counter to zero.
     */
    public function resetFailedLogins(): void
    {
        $this->update([
            'failed_login_attempts' => 0,
            'locked_until' => null,
        ]);
    }

    /**
     * Lock the user account for a given number of minutes.
     */
    public function lockAccount(int $minutes = 15): void
    {
        $this->update([
            'locked_until' => now()->addMinutes($minutes),
        ]);
    }

    /**
     * Get the user's Gravatar URL.
     */
    public function getAvatarUrlAttribute(): string
    {
        $hash = md5(strtolower(trim($this->email)));
        return "https://www.gravatar.com/avatar/{$hash}?s=80&d=404";
    }
}
