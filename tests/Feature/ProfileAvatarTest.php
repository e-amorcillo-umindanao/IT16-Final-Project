<?php

namespace Tests\Feature;

use App\Services\AvatarImageService;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProfileAvatarTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_upload_a_custom_profile_picture(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        $avatar = UploadedFile::fake()->image('portrait.png', 240, 240)->size(512);

        $response = $this
            ->actingAs($user)
            ->from('/profile')
            ->put(route('profile.avatar.update', absolute: false), [
                'avatar' => $avatar,
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/profile');

        $user->refresh();
        $log = AuditLog::query()->latest('id')->first();

        $this->assertNotNull($user->avatar_path);
        $this->assertMatchesRegularExpression('/^avatars\/[a-f0-9-]+\.(jpg|png|webp)$/', $user->avatar_path);
        Storage::disk('public')->assertExists($user->avatar_path);
        $this->assertSame('profile_updated', $log?->action);
        $this->assertSame('avatar_uploaded', $log?->metadata['action_detail'] ?? null);
    }

    public function test_large_avatar_is_resized_automatically_before_storage(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        $avatar = UploadedFile::fake()->image('large-avatar.png', 3200, 1800)->size(4096);

        $response = $this
            ->actingAs($user)
            ->from('/profile')
            ->put(route('profile.avatar.update', absolute: false), [
                'avatar' => $avatar,
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/profile');

        $user->refresh();
        $storedContents = Storage::disk('public')->get($user->avatar_path);
        $storedImageInfo = getimagesizefromstring($storedContents);
        $log = AuditLog::query()->latest('id')->first();

        $this->assertIsArray($storedImageInfo);
        $this->assertLessThanOrEqual(AvatarImageService::MAX_DIMENSION, $storedImageInfo[0]);
        $this->assertLessThanOrEqual(AvatarImageService::MAX_DIMENSION, $storedImageInfo[1]);
        $this->assertSame(true, $log?->metadata['was_resized'] ?? null);
        $this->assertSame(3200, $log?->metadata['original_dimensions']['width'] ?? null);
        $this->assertSame(1800, $log?->metadata['original_dimensions']['height'] ?? null);
    }

    public function test_avatar_image_service_auto_orients_rotated_jpeg_uploads(): void
    {
        $service = new class extends AvatarImageService
        {
            protected function readOrientation(string $path, string $mimeType): int
            {
                return 6;
            }
        };

        $avatar = UploadedFile::fake()->image('rotated-photo.jpg', 180, 320)->size(512);

        $normalized = $service->normalize($avatar);
        $storedImageInfo = getimagesizefromstring($normalized['contents']);

        $this->assertSame(320, $normalized['width']);
        $this->assertSame(180, $normalized['height']);
        $this->assertIsArray($storedImageInfo);
        $this->assertSame(320, $storedImageInfo[0]);
        $this->assertSame(180, $storedImageInfo[1]);
    }

    public function test_uploading_a_new_avatar_replaces_the_previous_file(): void
    {
        Storage::fake('public');

        $user = User::factory()->create([
            'avatar_path' => 'avatars/existing-avatar.jpg',
        ]);

        Storage::disk('public')->put($user->avatar_path, 'previous-avatar');

        $response = $this
            ->actingAs($user)
            ->from('/profile')
            ->put(route('profile.avatar.update', absolute: false), [
                'avatar' => UploadedFile::fake()->image('replacement.webp', 320, 320)->size(768),
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/profile');

        $user->refresh();

        Storage::disk('public')->assertMissing('avatars/existing-avatar.jpg');
        Storage::disk('public')->assertExists($user->avatar_path);
    }

    public function test_user_can_remove_a_custom_profile_picture(): void
    {
        Storage::fake('public');

        $user = User::factory()->create([
            'avatar_path' => 'avatars/profile-photo.jpg',
        ]);

        Storage::disk('public')->put($user->avatar_path, 'avatar-content');

        $response = $this
            ->actingAs($user)
            ->from('/profile')
            ->delete(route('profile.avatar.destroy', absolute: false));

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/profile');

        $user->refresh();
        $log = AuditLog::query()->latest('id')->first();

        $this->assertNull($user->avatar_path);
        Storage::disk('public')->assertMissing('avatars/profile-photo.jpg');
        $this->assertSame('profile_updated', $log?->action);
        $this->assertSame('avatar_removed', $log?->metadata['action_detail'] ?? null);
    }

    public function test_avatar_too_small_still_fails_validation(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        $avatar = UploadedFile::fake()->image('tiny-avatar.png', 40, 40)->size(128);

        $response = $this
            ->actingAs($user)
            ->from('/profile')
            ->put(route('profile.avatar.update', absolute: false), [
                'avatar' => $avatar,
            ]);

        $response
            ->assertSessionHasErrors('avatar')
            ->assertRedirect('/profile');
    }

    public function test_avatar_url_uses_same_origin_storage_path(): void
    {
        config()->set('filesystems.disks.public.url', 'http://localhost/storage');

        $user = User::factory()->create([
            'avatar_path' => 'avatars/profile-photo.jpg',
        ]);

        $this->assertSame('/storage/avatars/profile-photo.jpg', $user->avatar_url);
    }
}
