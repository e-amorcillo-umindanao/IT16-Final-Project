<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Database\QueryException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class RegisteredUserController extends Controller
{
    private const GENERIC_REGISTRATION_STATUS = 'If your email can be registered, we have sent the next steps to your inbox.';

    /**
     * Display the registration view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Register');
    }

    /**
     * Handle an incoming registration request.
     *
     */
    public function store(RegisterRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        if (!$request->verifyRecaptcha('register')) {
            return back()->withErrors([
                'recaptcha_token' => 'Bot verification failed. Please try again.',
            ]);
        }

        $email = mb_strtolower($validated['email']);

        if (User::query()->where('email', $email)->exists()) {
            return $this->registrationAcceptedResponse();
        }

        try {
            $user = User::create([
                'name' => $validated['name'],
                'email' => $email,
                'password' => Hash::make($validated['password']),
                'password_changed_at' => now(),
            ]);

            // Auto-verify until SMTP is configured. Remove this when email delivery is enabled.
            $user->markEmailAsVerified();

            $userRole = Role::findOrCreate('user', config('auth.defaults.guard', 'web'));

            $user->assignRole($userRole);

            event(new Registered($user));
        } catch (QueryException $exception) {
            if (!$this->isDuplicateEmailException($exception)) {
                throw $exception;
            }
        }

        return $this->registrationAcceptedResponse();
    }

    private function registrationAcceptedResponse(): RedirectResponse
    {
        return redirect()->route('login')->with('status', self::GENERIC_REGISTRATION_STATUS);
    }

    private function isDuplicateEmailException(QueryException $exception): bool
    {
        $errorInfo = $exception->errorInfo ?? [];
        $message = strtolower($exception->getMessage());

        return in_array($errorInfo[1] ?? null, [19, 1062, 1555, 2067], true)
            || str_contains($message, 'unique')
            || str_contains($message, 'duplicate');
    }
}
