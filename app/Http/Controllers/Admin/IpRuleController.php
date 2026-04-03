<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\IpRule;
use App\Rules\ValidCidr;
use App\Services\AuditService;
use App\Services\IpPolicyService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class IpRuleController extends Controller
{
    public function __construct(
        private readonly IpPolicyService $ipPolicy,
        private readonly AuditService $auditService,
    ) {
    }

    public function index(): Response
    {
        return Inertia::render('Admin/IpRules', [
            'currentIp' => request()->ip() ?? 'Unknown',
            'rules' => IpRule::query()
                ->with('creator:id,name')
                ->latest()
                ->get()
                ->map(fn (IpRule $rule) => [
                    'id' => $rule->id,
                    'type' => $rule->type,
                    'cidr' => $rule->cidr,
                    'label' => $rule->label,
                    'created_at' => $rule->created_at,
                    'creator' => $rule->creator ? [
                        'id' => $rule->creator->id,
                        'name' => $rule->creator->name,
                    ] : null,
                ]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'type' => ['required', 'in:allowlist,blocklist'],
            'cidr' => ['required', 'string', 'max:50', new ValidCidr()],
            'label' => ['nullable', 'string', 'max:255'],
        ]);

        $validated['cidr'] = strtolower(trim($validated['cidr']));
        $request->merge(['cidr' => $validated['cidr']]);

        $request->validate([
            'cidr' => [
                Rule::unique('ip_rules', 'cidr')->where(
                    fn ($query) => $query->where('type', $validated['type'])
                ),
            ],
        ], [
            'cidr.unique' => 'That IP rule already exists for the selected list type.',
        ]);

        $rule = IpRule::create([
            ...$validated,
            'created_by' => $request->user()->id,
        ]);

        $this->ipPolicy->clearCache();

        $this->auditService->log('ip_rule_added', metadata: [
            'type' => $rule->type,
            'cidr' => $rule->cidr,
            'label' => $rule->label,
        ]);

        return back()->with('success', 'IP rule added successfully.');
    }

    public function destroy(IpRule $ipRule): RedirectResponse
    {
        $this->auditService->log('ip_rule_removed', metadata: [
            'type' => $ipRule->type,
            'cidr' => $ipRule->cidr,
        ]);

        $ipRule->delete();
        $this->ipPolicy->clearCache();

        return back()->with('success', 'IP rule removed successfully.');
    }
}
