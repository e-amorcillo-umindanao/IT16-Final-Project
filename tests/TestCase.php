<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.recaptcha.site_key' => null,
            'services.recaptcha.secret_key' => null,
        ]);
    }
}
