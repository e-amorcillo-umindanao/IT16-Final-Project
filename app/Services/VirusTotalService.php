<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class VirusTotalService
{
    private string $baseUrl = 'https://www.virustotal.com/api/v3';

    /**
     * Scan a file for malware via VirusTotal.
     * Returns one of: clean, malicious, or unavailable.
     */
    public function scan(string $filePath): string
    {
        $config = config('services.virustotal', []);
        $key = $config['key'] ?? $config['api_key'] ?? env('VIRUSTOTAL_API_KEY');
        $timeout = max(5, (int) ($config['timeout'] ?? 30));
        $pollInterval = max(1, (int) ($config['poll_interval'] ?? 3));
        $maxWait = max($pollInterval, (int) ($config['max_wait'] ?? 60));
        $attempts = max(1, (int) ceil($maxWait / $pollInterval));
        $filename = basename($filePath);

        if (!is_file($filePath)) {
            Log::warning('VirusTotal scan skipped because file path does not exist.', [
                'path' => $filePath,
            ]);

            return 'unavailable';
        }

        $sha256 = hash_file('sha256', $filePath);

        if (!is_string($key) || trim($key) === '' || in_array(trim($key), ['your-key-here', 'changeme'], true)) {
            Log::warning('VirusTotal API key is missing or invalid.');
            return 'unavailable';
        }

        try {
            $existingReport = $this->fetchFileReport($key, $sha256, $timeout, $filename, logNotFound: false);

            if ($existingReport !== null) {
                return $this->normalizeResult($existingReport);
            }

            $upload = Http::timeout($timeout)
                ->withHeaders(['x-apikey' => $key])
                ->attach('file', file_get_contents($filePath), $filename)
                ->post("{$this->baseUrl}/files");

            if ($upload->failed()) {
                $uploadStatus = $upload->status();
                $uploadBody = $upload->body();

                Log::warning('VirusTotal upload failed', [
                    'status' => $uploadStatus,
                    'response' => $uploadBody,
                    'filename' => $filename,
                    'sha256' => $sha256,
                ]);

                if ($uploadStatus === 409) {
                    $conflictReport = $this->pollFileReport($key, $sha256, $timeout, $pollInterval, $attempts, $filename);

                    if ($conflictReport !== null) {
                        return $this->normalizeResult($conflictReport);
                    }
                }

                return 'unavailable';
            }

            $analysisId = $upload->json('data.id');

            if (!is_string($analysisId) || $analysisId === '') {
                Log::warning('VirusTotal upload response did not include an analysis id', [
                    'response' => $upload->body(),
                    'filename' => $filename,
                    'sha256' => $sha256,
                ]);

                return 'unavailable';
            }

            $report = $this->pollFileReport($key, $sha256, $timeout, $pollInterval, $attempts, $filename, $analysisId);

            if ($report !== null) {
                return $this->normalizeResult($report);
            }

            Log::warning('VirusTotal analysis timed out before completion', [
                'analysis_id' => $analysisId,
                'filename' => $filename,
                'sha256' => $sha256,
                'waited_seconds' => $attempts * $pollInterval,
            ]);

            return 'unavailable';

        } catch (Throwable $e) {
            Log::error('VirusTotal scan failed', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'filename' => $filename,
                'sha256' => $sha256,
            ]);

            return 'unavailable';
        }
    }

    private function pollFileReport(
        string $key,
        string $sha256,
        int $timeout,
        int $pollInterval,
        int $attempts,
        string $filename,
        ?string $analysisId = null,
    ): ?array {
        for ($attempt = 1; $attempt <= $attempts; $attempt++) {
            sleep($pollInterval);

            $report = $this->fetchFileReport($key, $sha256, $timeout, $filename, attempt: $attempt, analysisId: $analysisId);

            if ($report !== null) {
                return $report;
            }
        }

        return null;
    }

    private function fetchFileReport(
        string $key,
        string $sha256,
        int $timeout,
        string $filename,
        bool $logNotFound = true,
        ?int $attempt = null,
        ?string $analysisId = null,
    ): ?array {
        $response = Http::timeout($timeout)
            ->withHeaders(['x-apikey' => $key])
            ->get("{$this->baseUrl}/files/{$sha256}");

        if ($response->status() === 404) {
            if ($logNotFound && $attempt !== null) {
                Log::info('VirusTotal file report not ready yet', [
                    'sha256' => $sha256,
                    'filename' => $filename,
                    'attempt' => $attempt,
                    'analysis_id' => $analysisId,
                ]);
            }

            return null;
        }

        if ($response->failed()) {
            Log::warning('VirusTotal file report lookup failed', [
                'sha256' => $sha256,
                'filename' => $filename,
                'attempt' => $attempt,
                'analysis_id' => $analysisId,
                'status' => $response->status(),
                'response' => $response->body(),
            ]);

            return null;
        }

        $stats = $response->json('data.attributes.last_analysis_stats');

        if (!is_array($stats)) {
            Log::info('VirusTotal file report is available but missing analysis stats', [
                'sha256' => $sha256,
                'filename' => $filename,
                'attempt' => $attempt,
                'analysis_id' => $analysisId,
            ]);

            return null;
        }

        return [
            'status' => 'completed',
            'malicious' => $stats['malicious'] ?? 0,
            'suspicious' => $stats['suspicious'] ?? 0,
            'undetected' => $stats['undetected'] ?? 0,
            'harmless' => $stats['harmless'] ?? 0,
            'analysis_id' => $analysisId,
            'sha256' => $sha256,
        ];
    }

    private function normalizeResult(array $report): string
    {
        $malicious = (int) ($report['malicious'] ?? 0);
        $suspicious = (int) ($report['suspicious'] ?? 0);

        return ($malicious > 0 || $suspicious > 0) ? 'malicious' : 'clean';
    }
}
