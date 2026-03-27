<?php

namespace App\Http\Controllers;

use App\Http\Requests\AvatarRequest;
use App\Services\AvatarImageService;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class AvatarController extends Controller
{
    public function __construct(
        private readonly AuditService $auditService,
        private readonly AvatarImageService $avatarImageService,
    ) {
    }

    public function update(AvatarRequest $request): RedirectResponse
    {
        $user = $request->user();
        $file = $request->file('avatar');
        $previousAvatarPath = $user->avatar_path;

        try {
            $normalizedAvatar = $this->avatarImageService->normalize($file);
        } catch (RuntimeException $exception) {
            return Redirect::back()->withErrors([
                'avatar' => $exception->getMessage(),
            ]);
        }

        $filename = Str::uuid().'.'.$normalizedAvatar['extension'];
        $path = 'avatars/'.$filename;

        // Deliberate exception to Hard Constraint #7: avatars are non-sensitive
        // public assets. Sensitive encrypted documents remain in storage/app/vault.
        $stored = Storage::disk('public')->put($path, $normalizedAvatar['contents']);

        if ($stored !== true) {
            return Redirect::back()->with('error', 'Unable to upload profile picture.');
        }

        $user->update([
            'avatar_path' => $path,
        ]);

        if (is_string($previousAvatarPath) && $previousAvatarPath !== '') {
            Storage::disk('public')->delete($previousAvatarPath);
        }

        $this->auditService->log('profile_updated', $user, [
            'action_detail' => 'avatar_uploaded',
            'was_resized' => $normalizedAvatar['was_resized'],
            'original_dimensions' => [
                'width' => $normalizedAvatar['original_width'],
                'height' => $normalizedAvatar['original_height'],
            ],
            'stored_dimensions' => [
                'width' => $normalizedAvatar['width'],
                'height' => $normalizedAvatar['height'],
            ],
        ]);

        return Redirect::back()->with('success', 'Profile picture updated successfully.');
    }

    public function destroy(Request $request): RedirectResponse
    {
        $user = $request->user();

        if (! is_string($user->avatar_path) || $user->avatar_path === '') {
            return Redirect::back()->with('error', 'No profile picture to remove.');
        }

        Storage::disk('public')->delete($user->avatar_path);

        $user->update([
            'avatar_path' => null,
        ]);

        $this->auditService->log('profile_updated', $user, [
            'action_detail' => 'avatar_removed',
        ]);

        return Redirect::back()->with('success', 'Profile picture removed successfully.');
    }
}
