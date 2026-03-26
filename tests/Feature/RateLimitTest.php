<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class RateLimitTest extends TestCase
{
    use RefreshDatabase;

    public function test_search_is_limited_to_thirty_requests_per_minute(): void
    {
        $user = User::factory()->create();

        for ($attempt = 1; $attempt <= 30; $attempt++) {
            $this->actingAs($user)
                ->getJson('/search?q=report')
                ->assertOk();
        }

        $this->actingAs($user)
            ->getJson('/search?q=report')
            ->assertTooManyRequests();
    }

    public function test_general_limiter_is_applied_to_miscellaneous_authenticated_routes(): void
    {
        $middleware = Route::getRoutes()
            ->getByName('profile.edit')
            ?->gatherMiddleware();

        $this->assertIsArray($middleware);
        $this->assertContains('throttle:general', $middleware);
    }
}
