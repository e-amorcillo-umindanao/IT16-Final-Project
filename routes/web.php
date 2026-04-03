<?php

use App\Http\Controllers\Admin\AdminController;
use App\Http\Controllers\Admin\AdminDocumentController;
use App\Http\Controllers\Admin\AuditIntegrityController;
use App\Http\Controllers\Admin\IpRuleController;
use App\Http\Controllers\AccountDeletionController;
use App\Http\Controllers\Auth\ExpiredPasswordController;
use App\Http\Controllers\Auth\TwoFactorController;
use App\Http\Controllers\AvatarController;
use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\DataExportController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\SessionController;
use App\Http\Controllers\ShareController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    if (auth()->check()) {
        return redirect()->route('dashboard');
    }

    return redirect()->route('login');
});

use App\Http\Controllers\DashboardController;

Route::middleware(['auth', 'verified', 'account-active', 'two-factor', 'password-not-expired', 'check-ip-policy', 'throttle:general'])->group(function () {
    Route::get('/password/expired', [ExpiredPasswordController::class, 'show'])
        ->name('password.expired');
    Route::patch('/password/expired', [ExpiredPasswordController::class, 'update'])
        ->name('password.expired.update');

    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::put('/profile/avatar', [AvatarController::class, 'update'])->name('profile.avatar.update');
    Route::delete('/profile/avatar', [AvatarController::class, 'destroy'])->name('profile.avatar.destroy');
    Route::post('/profile/export', [DataExportController::class, 'request'])
        ->middleware('throttle:2,60')
        ->name('profile.export.request');
    Route::post('/profile/delete-account', [AccountDeletionController::class, 'request'])
        ->name('profile.delete-account');
    Route::put('/profile/password', [ProfileController::class, 'updatePassword'])->name('profile.password.update');
    Route::delete('/two-factor', [ProfileController::class, 'destroyTwoFactor'])->name('two-factor.destroy');
    Route::post('/two-factor/recovery-codes/regenerate', [TwoFactorController::class, 'regenerateCodes'])
        ->name('two-factor.recovery-codes.regenerate');

    Route::get('/sessions', [SessionController::class, 'index'])->name('sessions.index');
    Route::delete('/sessions/{session}', [SessionController::class, 'destroy'])->name('sessions.destroy');

    // Documents
    Route::post('/documents/bulk-download', [DocumentController::class, 'bulkDownload'])
        ->name('documents.bulk-download');
    Route::delete('/documents/bulk-delete', [DocumentController::class, 'bulkDelete'])
        ->name('documents.bulk-delete');
    Route::post('/documents', [DocumentController::class, 'store'])
        ->middleware('throttle:upload')
        ->name('documents.store');
    Route::resource('documents', DocumentController::class)->except('store');
    Route::get('/documents/{document}/download', [DocumentController::class, 'download'])->name('documents.download');
    Route::post('/documents/{document}/replace', [DocumentController::class, 'replace'])
        ->name('documents.replace');
    Route::post('/documents/{document}/versions/{version}/restore', [DocumentController::class, 'restoreVersion'])
        ->name('documents.versions.restore');
    Route::patch('/documents/{document}/star', [DocumentController::class, 'toggleStar'])->name('documents.star');
    Route::post('/documents/{document}/share-link', [DocumentController::class, 'generateShareLink'])
        ->name('documents.share-link');

    // Trash
    Route::get('/trash', [DocumentController::class, 'trash'])->name('documents.trash');
    Route::post('/trash/{id}/restore', [DocumentController::class, 'restore'])->name('documents.restore');
    Route::post('/trash/restore-selected', [DocumentController::class, 'restoreSelected'])->name('documents.restore-selected');
    Route::delete('/trash/{id}', [DocumentController::class, 'forceDelete'])->name('documents.force-delete');
    Route::delete('/trash', [DocumentController::class, 'emptyTrash'])->name('documents.empty-trash');

    // Sharing
    Route::post('/documents/{document}/shares', [ShareController::class, 'store'])->name('shares.store');
    Route::delete('/shares/{share}', [ShareController::class, 'destroy'])->name('shares.destroy');
    Route::get('/shared', [ShareController::class, 'sharedWithMe'])->name('shared.index');

    // Activity
    Route::get('/activity', [AuditLogController::class, 'index'])->name('activity.index');
    Route::get('/activity/export', [AuditLogController::class, 'export'])->name('activity.export');
    Route::get('/activity/export/pdf', [AuditLogController::class, 'exportPdf'])->name('activity.export-pdf');
    Route::get('/search', [SearchController::class, 'search'])
        ->middleware('throttle:search')
        ->name('search');

    Route::post('/vault/unlock', function (Request $request) {
        $request->validate([
            'password' => ['required', 'string'],
        ]);

        if (Hash::check($request->password, $request->user()->password)) {
            return response()->json(['success' => true]);
        }

        return response()->json(['error' => 'Invalid password'], 401);
    })->middleware('throttle:vault-unlock')->name('vault.unlock');

    // Administration
    Route::prefix('admin')->name('admin.')->group(function () {
        Route::get('/', [AdminController::class, 'dashboard'])
            ->middleware('permission:view_admin_dashboard')
            ->name('dashboard');

        Route::get('/users', [AdminController::class, 'users'])
            ->middleware('permission:manage_users')
            ->name('users');
        Route::get('/users/export', [AdminController::class, 'exportUsers'])
            ->middleware('permission:manage_users')
            ->name('users.export');
        Route::patch('/users/{user}/activate', [AdminController::class, 'activateUser'])
            ->middleware('permission:manage_users')
            ->name('users.activate');
        Route::patch('/users/{user}/deactivate', [AdminController::class, 'deactivateUser'])
            ->middleware('permission:manage_users')
            ->name('users.deactivate');
        Route::patch('/users/{user}/role', [AdminController::class, 'changeUserRole'])
            ->middleware('permission:manage_users')
            ->name('users.role');

        Route::get('/documents', [AdminDocumentController::class, 'index'])
            ->middleware('permission:view_all_documents')
            ->name('documents');
        Route::get('/documents/export', [AdminDocumentController::class, 'export'])
            ->middleware('permission:view_all_documents')
            ->name('documents.export');

        Route::get('/audit-logs', [AdminController::class, 'auditLogs'])
            ->middleware('permission:view_audit_logs')
            ->name('audit-logs');
        Route::get('/audit-integrity', [AuditIntegrityController::class, 'index'])
            ->middleware('permission:view_audit_logs')
            ->name('audit-integrity');
        Route::post('/audit-integrity/verify', [AuditIntegrityController::class, 'verify'])
            ->middleware('permission:view_audit_logs')
            ->name('audit-integrity.verify');
        Route::get('/audit-integrity/export-pdf', [AuditIntegrityController::class, 'exportPdf'])
            ->middleware('permission:view_audit_logs')
            ->name('audit-integrity.export-pdf');
        Route::middleware('permission:manage_ip_rules')->group(function () {
            Route::get('/ip-rules', [IpRuleController::class, 'index'])
                ->name('ip-rules.index');
            Route::post('/ip-rules', [IpRuleController::class, 'store'])
                ->name('ip-rules.store');
            Route::delete('/ip-rules/{ipRule}', [IpRuleController::class, 'destroy'])
                ->name('ip-rules.destroy');
        });
        Route::get('/audit-logs/export', [AdminController::class, 'exportAuditLogs'])
            ->middleware('permission:view_audit_logs')
            ->name('audit-logs.export');
        Route::get('/audit-logs/export/pdf', [AdminController::class, 'exportAuditLogsPdf'])
            ->middleware('permission:view_audit_logs')
            ->name('audit-logs.export-pdf');

        Route::get('/sessions', [AdminController::class, 'sessions'])
            ->middleware('permission:manage_sessions')
            ->name('sessions');
        Route::delete('/sessions', [AdminController::class, 'destroyAllSessions'])
            ->middleware('permission:manage_sessions')
            ->name('sessions.destroy-all');
        Route::delete('/sessions/{session}', [AdminController::class, 'destroySession'])
            ->middleware('permission:manage_sessions')
            ->name('sessions.destroy');
    });
});

Route::get('/shared/access/{document}', [DocumentController::class, 'accessViaLink'])
    ->middleware('signed')
    ->name('documents.access-link');
Route::get('/exports/{token}/download', [DataExportController::class, 'download'])
    ->middleware('signed')
    ->name('exports.download');
Route::get('/account/cancel-deletion/{token}', [AccountDeletionController::class, 'cancel'])
    ->name('account.cancel-deletion');

require __DIR__.'/auth.php';
