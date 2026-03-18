<?php

use App\Http\Controllers\Admin\AdminController;
use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SessionController;
use App\Http\Controllers\ShareController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    if (auth()->check()) {
        return redirect()->route('dashboard');
    }
    
    return redirect()->route('login');
});

use App\Http\Controllers\DashboardController;

Route::get('/dashboard', [DashboardController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('/sessions', [SessionController::class, 'index'])->name('sessions.index');
    Route::delete('/sessions/{session}', [SessionController::class, 'destroy'])->name('sessions.destroy');

    // Documents
    Route::resource('documents', DocumentController::class);
    Route::get('/documents/{document}/download', [DocumentController::class, 'download'])->name('documents.download');
    
    // Trash
    Route::get('/trash', [DocumentController::class, 'trash'])->name('documents.trash');
    Route::post('/trash/{id}/restore', [DocumentController::class, 'restore'])->name('documents.restore');
    Route::delete('/trash/{id}/force', [DocumentController::class, 'forceDelete'])->name('documents.force-delete');

    // Sharing
    Route::post('/documents/{document}/shares', [ShareController::class, 'store'])->name('shares.store');
    Route::delete('/shares/{share}', [ShareController::class, 'destroy'])->name('shares.destroy');
    Route::get('/shared', [ShareController::class, 'sharedWithMe'])->name('shared.index');

    // Activity
    Route::get('/activity', [AuditLogController::class, 'index'])->name('activity.index');

    // Administration
    Route::group([
        'prefix' => 'admin',
        'middleware' => ['role:super-admin|admin']
    ], function () {
        Route::get('/', [AdminController::class, 'dashboard'])->name('admin.dashboard');
        
        // Users
        Route::get('/users', [AdminController::class, 'users'])->name('admin.users');
        Route::patch('/users/{user}/toggle-active', [AdminController::class, 'toggleUserActive'])->name('admin.users.toggle-active');
        Route::patch('/users/{user}/role', [AdminController::class, 'updateUserRole'])->name('admin.users.role');
        
        // Audit Logs
        Route::get('/audit-logs', [AdminController::class, 'auditLogs'])->name('admin.audit-logs');
        
        // Sessions
        Route::get('/sessions', [AdminController::class, 'sessions'])->name('admin.sessions');
        Route::delete('/sessions/{session}', [AdminController::class, 'destroySession'])->name('admin.sessions.destroy');
    });
});

require __DIR__.'/auth.php';
