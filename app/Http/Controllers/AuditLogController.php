<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Document;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class AuditLogController extends Controller
{
    /**
     * Display a listing of the user's activity logs.
     */
    public function index(Request $request): Response
    {
        $query = AuditLog::where('user_id', Auth::id())
            ->with(['auditable' => function ($query) {
                // Morph to document to get the name/metadata
                $query->withTrashed();
            }])
            ->latest('id');

        // Apply filters
        if ($request->action) {
            $query->where('action', $request->action);
        }

        if ($request->date_from) {
            $query->where('created_at', '>=', $request->date_from . ' 00:00:00');
        }

        if ($request->date_to) {
            $query->where('created_at', '<=', $request->date_to . ' 23:59:59');
        }

        // Get distinct actions for the filter dropdown
        $actionTypes = AuditLog::where('user_id', Auth::id())
            ->distinct()
            ->pluck('action')
            ->toArray();

        return Inertia::render('Activity/Index', [
            'logs' => $query->paginate(25)->withQueryString(),
            'filters' => $request->only(['action', 'date_from', 'date_to']),
            'actionTypes' => $actionTypes,
        ]);
    }
}
