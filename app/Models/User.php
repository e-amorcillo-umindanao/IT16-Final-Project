<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable implements MustVerifyEmail
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
        'avatar_path',
        'google_id',
        'google_avatar',
        'password',
        'password_changed_at',
        'deletion_requested_at',
        'deletion_scheduled_for',
        'deletion_cancel_token',
        'two_factor_secret',
        'two_factor_enabled',
        'two_factor_deadline',
        'failed_login_attempts',
        'locked_until',
        'last_login_at',
        'last_login_ip',
        'last_login_location',
        'is_active',
        'is_system_account',
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
        'deletion_cancel_token',
        'two_factor_secret',
        'google_id',
        'google_avatar',
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
            'password_changed_at' => 'datetime',
            'deletion_requested_at' => 'datetime',
            'deletion_scheduled_for' => 'datetime',
            'two_factor_secret' => 'encrypted',
            'two_factor_enabled' => 'boolean',
            'two_factor_deadline' => 'datetime',
            'is_active' => 'boolean',
            'is_system_account' => 'boolean',
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

    public function twoFactorRecoveryCodes(): HasMany
    {
        return $this->hasMany(TwoFactorRecoveryCode::class);
    }

    public function dataExports(): HasMany
    {
        return $this->hasMany(DataExport::class);
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
     * Determine whether the decrypted 2FA secret is present and valid.
     */
    public function hasTwoFactorSecretValid(): bool
    {
        return !empty($this->two_factor_secret)
            && strlen($this->two_factor_secret) >= 16;
    }

    public function isPasswordExpired(): bool
    {
        $expiryDays = config('securevault.password_expiry_days');

        if ($expiryDays === 0) {
            return false;
        }

        $changedAt = $this->password_changed_at ?? $this->created_at;

        if ($changedAt === null) {
            return false;
        }

        return $changedAt->copy()->addDays($expiryDays)->isPast();
    }

    public function daysUntilPasswordExpiry(): int
    {
        $expiryDays = config('securevault.password_expiry_days');

        if ($expiryDays === 0) {
            return 0;
        }

        $changedAt = $this->password_changed_at ?? $this->created_at;

        if ($changedAt === null) {
            return 0;
        }

        $expiryDate = $changedAt->copy()->addDays($expiryDays)->startOfDay();

        return max(0, now()->startOfDay()->diffInDays($expiryDate, false));
    }

    public function scopeNotSystem(Builder $query): Builder
    {
        return $query->where('is_system_account', false);
    }

    public function isSystemAccount(): bool
    {
        return (bool) $this->is_system_account;
    }

    public function hasGoogleLinked(): bool
    {
        return is_string($this->google_id) && $this->google_id !== '';
    }

    public function getAvatarUrlAttribute(): ?string
    {
        if (is_string($this->avatar_path) && $this->avatar_path !== '') {
            $url = Storage::disk('public')->url($this->avatar_path);
            $parsedUrl = parse_url($url);

            if ($parsedUrl === false || ! isset($parsedUrl['host'])) {
                return $url;
            }

            $path = $parsedUrl['path'] ?? $url;
            $query = isset($parsedUrl['query']) ? '?'.$parsedUrl['query'] : '';
            $fragment = isset($parsedUrl['fragment']) ? '#'.$parsedUrl['fragment'] : '';

            return $path.$query.$fragment;
        }

        if (is_string($this->google_avatar) && $this->google_avatar !== '') {
            return $this->google_avatar;
        }

        return null;
    }
}
