<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class VirusTotalService
{
    private string $baseUrl = 'https://www.virustotal.com/api/v3';

    /**
     * Scan a file for malware via VirusTotal.
     * Returns detection statistics and status.
     */
    public function scan(UploadedFile $file): array
    {
        $key = config('services.virustotal.api_key');

        if (empty($key)) {
            Log::warning('VirusTotal API key is missing.');
            return ['status' => 'unavailable', 'malicious' => 0, 'suspicious' => 0];
        }

        try {
            // 1. Upload file
            $upload = Http::timeout(30)
                ->withHeaders(['x-apikey' => $key])
                ->attach('file', file_get_contents($file->getRealPath()), $file->getClientOriginalName())
                ->post("{$this->baseUrl}/files");

            if ($upload->failed()) {
                Log::warning('VirusTotal upload failed', ['status' => $upload->status(), 'response' => $upload->body()]);
                return ['status' => 'unavailable', 'malicious' => 0, 'suspicious' => 0];
            }

            $analysisId = $upload->json('data.id');

            // 2. Poll for results (up to 30 seconds)
            for ($i = 0; $i < 10; $i++) {
                sleep(3);
                $result = Http::timeout(10)
                    ->withHeaders(['x-apikey' => $key])
                    ->get("{$this->baseUrl}/analyses/{$analysisId}");

                if ($result->failed()) {
                    continue;
                }

                if ($result->json('data.attributes.status') === 'completed') {
                    $stats = $result->json('data.attributes.stats');
                    return [
                        'status'      => 'completed',
                        'malicious'   => $stats['malicious']  ?? 0,
                        'suspicious'  => $stats['suspicious'] ?? 0,
                        'undetected'  => $stats['undetected'] ?? 0,
                        'harmless'    => $stats['harmless']   ?? 0,
                        'analysis_id' => $analysisId,
                    ];
                }
            }

            Log::warning('VirusTotal timed out', ['analysis_id' => $analysisId]);
            return ['status' => 'timeout', 'malicious' => 0, 'suspicious' => 0];

        } catch (\Exception $e) {
            Log::error('VirusTotal service error', ['error' => $e->getMessage()]);
            return ['status' => 'error', 'malicious' => 0, 'suspicious' => 0];
        }
    }
}
