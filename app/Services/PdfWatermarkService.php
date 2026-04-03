<?php

namespace App\Services;

use App\Models\Document;
use App\Models\User;
use setasign\Fpdi\Fpdi;
use setasign\Fpdi\PdfParser\StreamReader;

class PdfWatermarkService
{
    public function apply(string $decryptedPdfContent, User $downloader, Document $document): string
    {
        $pdf = new WatermarkingFpdi();
        $pdf->SetCompression(false);
        $pageCount = $pdf->setSourceFile(StreamReader::createByString($decryptedPdfContent));

        $lines = [
            $this->normalizeText($downloader->name),
            $this->normalizeText($downloader->email),
            $this->normalizeText(now()->format('Y-m-d H:i:s T')),
            $this->normalizeText($document->original_name),
        ];

        for ($pageNo = 1; $pageNo <= $pageCount; $pageNo++) {
            $templateId = $pdf->importPage($pageNo);
            $size = $pdf->getTemplateSize($templateId);

            $pdf->AddPage(
                $size['width'] > $size['height'] ? 'L' : 'P',
                [$size['width'], $size['height']],
            );
            $pdf->useTemplate($templateId);

            $centerX = $size['width'] / 2;
            $centerY = $size['height'] / 2;
            $lineHeight = 6;
            $blockWidth = max(80, min($size['width'] - 20, 150));
            $startY = $centerY - (($lineHeight * count($lines)) / 2);

            $pdf->SetFont('Helvetica', '', 10);
            $pdf->SetTextColor(190, 190, 190);
            $pdf->Rotate(45, $centerX, $centerY);

            foreach ($lines as $index => $line) {
                $pdf->SetXY($centerX - ($blockWidth / 2), $startY + ($index * $lineHeight));
                $pdf->Cell($blockWidth, $lineHeight, $line, 0, 0, 'C');
            }

            $pdf->Rotate(0);
        }

        return $pdf->Output('S');
    }

    private function normalizeText(string $value): string
    {
        $normalized = trim(preg_replace('/\s+/', ' ', $value) ?? '');

        if ($normalized === '') {
            return 'Unknown';
        }

        if (function_exists('iconv')) {
            $converted = iconv('UTF-8', 'windows-1252//TRANSLIT//IGNORE', $normalized);

            if ($converted !== false && $converted !== '') {
                return $converted;
            }
        }

        $asciiFallback = preg_replace('/[^\x20-\x7E]/', '', $normalized) ?? '';

        return trim($asciiFallback) !== '' ? trim($asciiFallback) : 'Unknown';
    }
}

class WatermarkingFpdi extends Fpdi
{
    private float $angle = 0.0;

    public function Rotate(float $angle, float $x = -1, float $y = -1): void
    {
        if ($this->angle !== 0.0) {
            $this->_out('Q');
        }

        $this->angle = $angle;

        if ($angle === 0.0) {
            return;
        }

        if ($x === -1) {
            $x = $this->x;
        }

        if ($y === -1) {
            $y = $this->y;
        }

        $angleInRadians = deg2rad($angle);
        $cosine = cos($angleInRadians);
        $sine = sin($angleInRadians);
        $centerX = $x * $this->k;
        $centerY = ($this->h - $y) * $this->k;

        $this->_out(sprintf(
            'q %.5F %.5F %.5F %.5F %.5F %.5F cm 1 0 0 1 %.5F %.5F cm',
            $cosine,
            $sine,
            -$sine,
            $cosine,
            $centerX,
            $centerY,
            -$centerX,
            -$centerY,
        ));
    }

    protected function _endpage(): void
    {
        if ($this->angle !== 0.0) {
            $this->angle = 0.0;
            $this->_out('Q');
        }

        parent::_endpage();
    }
}
