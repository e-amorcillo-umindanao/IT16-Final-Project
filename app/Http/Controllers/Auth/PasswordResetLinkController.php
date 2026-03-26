<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Password;
use Inertia\Inertia;
use Inertia\Response;

class PasswordResetLinkController extends Controller
{
    private const GENERIC_RESET_STATUS = 'If that email address is in our system, we have sent a password reset link.';

    /**
     * Display the password reset link request view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/ForgotPassword', [
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming password reset link request.
     *
     */
    public function store(ForgotPasswordRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        if (!$request->verifyRecaptcha('forgot_password')) {
            return back()->withErrors([
                'recaptcha_token' => 'Bot verification failed. Please try again.',
            ]);
        }

        Password::sendResetLink([
            'email' => $validated['email'],
        ]);

        return back()->with('status', self::GENERIC_RESET_STATUS);
    }
}
