<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class VirusTotalService
{
    private string $baseUrl = 'https://www.virustotal.com/api/v3';
    private const UNAVAILABLE_RESULT = ['status' => 'unavailable', 'malicious' => 0, 'suspicious' => 0];

    /**
     * Scan a file for malware via VirusTotal.
     * Returns detection statistics and status.
     */
    public function scan(UploadedFile $file): array
    {
        $config = config('services.virustotal', []);
        $key = $config['key'] ?? $config['api_key'] ?? env('VIRUSTOTAL_API_KEY');
        $timeout = max(5, (int) ($config['timeout'] ?? 30));
        $pollInterval = max(1, (int) ($config['poll_interval'] ?? 3));
        $maxWait = max($pollInterval, (int) ($config['max_wait'] ?? 60));
        $attempts = max(1, (int) ceil($maxWait / $pollInterval));
        $sha256 = hash_file('sha256', $file->getRealPath());

        if (!is_string($key) || trim($key) === '' || in_array(trim($key), ['your-key-here', 'changeme'], true)) {
            Log::warning('VirusTotal API key is missing or invalid.');
            return self::UNAVAILABLE_RESULT;
        }

        try {
            $existingReport = $this->fetchFileReport($key, $sha256, $timeout, $file->getClientOriginalName(), logNotFound: false);

            if ($existingReport !== null) {
                return $existingReport;
            }

            // 1. Upload file
            $upload = Http::timeout($timeout)
                ->withHeaders(['x-apikey' => $key])
                ->attach('file', file_get_contents($file->getRealPath()), $file->getClientOriginalName())
                ->post("{$this->baseUrl}/files");

            if ($upload->failed()) {
                $uploadStatus = $upload->status();
                $uploadBody = $upload->body();

                Log::warning('VirusTotal upload failed', [
                    'status' => $uploadStatus,
                    'response' => $uploadBody,
                    'filename' => $file->getClientOriginalName(),
                    'sha256' => $sha256,
                ]);

                if ($uploadStatus === 409) {
                    $conflictReport = $this->pollFileReport($key, $sha256, $timeout, $pollInterval, $attempts, $file->getClientOriginalName());

                    if ($conflictReport !== null) {
                        return $conflictReport;
                    }
                }

                return self::UNAVAILABLE_RESULT;
            }

            $analysisId = $upload->json('data.id');

            if (!is_string($analysisId) || $analysisId === '') {
                Log::warning('VirusTotal upload response did not include an analysis id', [
                    'response' => $upload->body(),
                    'filename' => $file->getClientOriginalName(),
                    'sha256' => $sha256,
                ]);

                return self::UNAVAILABLE_RESULT;
            }

            $report = $this->pollFileReport($key, $sha256, $timeout, $pollInterval, $attempts, $file->getClientOriginalName(), $analysisId);

            if ($report !== null) {
                return $report;
            }

            Log::warning('VirusTotal analysis timed out before completion', [
                'analysis_id' => $analysisId,
                'filename' => $file->getClientOriginalName(),
                'sha256' => $sha256,
                'waited_seconds' => $attempts * $pollInterval,
            ]);

            return ['status' => 'timeout', 'malicious' => 0, 'suspicious' => 0];

        } catch (Throwable $e) {
            Log::error('VirusTotal scan failed', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'filename' => $file->getClientOriginalName(),
                'sha256' => $sha256,
            ]);

            return ['status' => 'error', 'malicious' => 0, 'suspicious' => 0];
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
}
