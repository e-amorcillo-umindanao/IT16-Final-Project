<?php

namespace Tests\Feature;

use App\Models\Document;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class AdminDocumentsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_super_admin_can_view_all_documents_page_with_integrity_and_owner_filter_props(): void
    {
        $superAdmin = User::factory()->create([
            'name' => 'Zulu Super Admin',
        ]);
        $superAdmin->assignRole('super-admin');

        $alice = User::factory()->create([
            'name' => 'Alice Owner',
            'email' => 'alice@example.com',
        ]);

        $bob = User::factory()->create([
            'name' => 'Bob Owner',
            'email' => 'bob@example.com',
        ]);

        $hashedDocument = $this->createDocument($alice, [
            'original_name' => 'Alpha Policy.pdf',
            'file_hash' => str_repeat('a', 64),
            'created_at' => now()->subMinute(),
            'updated_at' => now()->subMinute(),
        ]);

        $emptyHashDocument = $this->createDocument($bob, [
            'original_name' => 'Zulu Report.pdf',
            'file_hash' => '',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($superAdmin)
            ->get(route('admin.documents'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Documents/Index')
                ->where('sort', 'created_at')
                ->where('direction', 'desc')
                ->where('selectedOwner', null)
                ->where('documents.data.0.id', $emptyHashDocument->id)
                ->where('documents.data.0.file_hash', '')
                ->where('documents.data.1.id', $hashedDocument->id)
                ->where('documents.data.1.file_hash', str_repeat('a', 64))
                ->where('users.0.label', 'Alice Owner (alice@example.com)')
                ->where('users.1.label', 'Bob Owner (bob@example.com)'));
    }

    public function test_all_documents_page_can_sort_by_owner_and_filter_by_selected_owner(): void
    {
        $superAdmin = User::factory()->create([
            'name' => 'Zulu Super Admin',
        ]);
        $superAdmin->assignRole('super-admin');

        $alpha = User::factory()->create([
            'name' => 'Alpha Owner',
            'email' => 'alpha@example.com',
        ]);

        $zulu = User::factory()->create([
            'name' => 'Zulu Owner',
            'email' => 'zulu@example.com',
        ]);

        $largestAlphaDocument = $this->createDocument($alpha, [
            'original_name' => 'Largest Alpha.pdf',
            'file_size' => 4096,
        ]);

        $this->createDocument($alpha, [
            'original_name' => 'Smaller Alpha.pdf',
            'file_size' => 1024,
        ]);

        $this->createDocument($zulu, [
            'original_name' => 'Zulu File.pdf',
            'file_size' => 2048,
        ]);

        $this->actingAs($superAdmin)
            ->get(route('admin.documents', [
                'sort' => 'owner',
                'direction' => 'asc',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Documents/Index')
                ->where('sort', 'owner')
                ->where('direction', 'asc')
                ->where('documents.data.0.user.name', 'Alpha Owner'));

        $this->actingAs($superAdmin)
            ->get(route('admin.documents', [
                'owner_id' => $alpha->id,
                'sort' => 'file_size',
                'direction' => 'desc',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Documents/Index')
                ->where('sort', 'file_size')
                ->where('direction', 'desc')
                ->where('selectedOwner', (string) $alpha->id)
                ->where('documents.data.0.id', $largestAlphaDocument->id)
                ->where('documents.data.1.user.name', 'Alpha Owner'));
    }

    private function createDocument(User $owner, array $overrides = []): Document
    {
        static $sequence = 1;

        $document = null;

        Document::unguarded(function () use ($owner, $overrides, $sequence, &$document): void {
            $document = Document::create(array_merge([
                'user_id' => $owner->id,
                'original_name' => "Document {$sequence}.pdf",
                'encrypted_name' => "encrypted-document-{$sequence}.bin",
                'mime_type' => 'application/pdf',
                'file_size' => 1024 * $sequence,
                'encryption_iv' => base64_encode(random_bytes(16)),
                'file_hash' => str_repeat((string) ($sequence % 10), 64),
                'description' => null,
                'is_starred' => false,
                'current_version' => 1,
                'scan_result' => 'clean',
                'created_at' => now()->addSeconds($sequence),
                'updated_at' => now()->addSeconds($sequence),
            ], $overrides));
        });

        $sequence++;

        return $document;
    }
}
