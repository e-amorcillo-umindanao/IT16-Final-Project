<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('vault:purge-trash')->daily();
Schedule::command('securevault:purge-expired-exports')->daily();
Schedule::command('securevault:purge-deletions')->dailyAt('02:00');
