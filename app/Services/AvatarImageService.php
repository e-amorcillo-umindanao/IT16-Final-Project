<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use RuntimeException;

class AvatarImageService
{
    public const MAX_DIMENSION = 512;

    /**
     * Normalize an avatar image, resizing it down if needed while preserving aspect ratio.
     *
     * @return array{
     *     contents: string,
     *     extension: string,
     *     width: int,
     *     height: int,
     *     original_width: int,
     *     original_height: int,
     *     was_resized: bool
     * }
     */
    public function normalize(UploadedFile $file): array
    {
        $imageInfo = getimagesize($file->getRealPath());

        if ($imageInfo === false) {
            throw new RuntimeException('Unable to read the uploaded image.');
        }

        [$originalWidth, $originalHeight] = $imageInfo;
        $mimeType = $imageInfo['mime'] ?? $file->getMimeType() ?? '';
        $extension = $this->extensionForMimeType($mimeType);

        $sourceImage = $this->createImageResource($file->getRealPath(), $mimeType);
        $sourceImage = $this->applyOrientation(
            $sourceImage,
            $this->readOrientation($file->getRealPath(), $mimeType),
        );

        $sourceWidth = imagesx($sourceImage);
        $sourceHeight = imagesy($sourceImage);

        $scale = min(
            self::MAX_DIMENSION / $sourceWidth,
            self::MAX_DIMENSION / $sourceHeight,
            1,
        );
        $targetWidth = max(1, (int) round($sourceWidth * $scale));
        $targetHeight = max(1, (int) round($sourceHeight * $scale));
        $wasResized = $targetWidth !== $sourceWidth || $targetHeight !== $sourceHeight;

        $targetImage = imagecreatetruecolor($targetWidth, $targetHeight);

        if ($targetImage === false) {
            imagedestroy($sourceImage);
            throw new RuntimeException('Unable to create an image canvas.');
        }

        $this->prepareCanvas($targetImage, $mimeType, $targetWidth, $targetHeight);

        imagecopyresampled(
            $targetImage,
            $sourceImage,
            0,
            0,
            0,
            0,
            $targetWidth,
            $targetHeight,
            $sourceWidth,
            $sourceHeight,
        );

        $contents = $this->encodeImage($targetImage, $mimeType);

        imagedestroy($sourceImage);
        imagedestroy($targetImage);

        return [
            'contents' => $contents,
            'extension' => $extension,
            'width' => $targetWidth,
            'height' => $targetHeight,
            'original_width' => $originalWidth,
            'original_height' => $originalHeight,
            'was_resized' => $wasResized,
        ];
    }

    protected function readOrientation(string $path, string $mimeType): int
    {
        if ($mimeType !== 'image/jpeg' || ! function_exists('exif_read_data')) {
            return 1;
        }

        $exif = @exif_read_data($path);
        $orientation = is_array($exif) ? ($exif['Orientation'] ?? 1) : 1;

        return is_numeric($orientation) ? (int) $orientation : 1;
    }

    private function applyOrientation(\GdImage $image, int $orientation): \GdImage
    {
        return match ($orientation) {
            2 => $this->flipImage($image, IMG_FLIP_HORIZONTAL),
            3 => $this->rotateImage($image, 180),
            4 => $this->flipImage($image, IMG_FLIP_VERTICAL),
            5 => $this->flipImage($this->rotateImage($image, -90), IMG_FLIP_HORIZONTAL),
            6 => $this->rotateImage($image, -90),
            7 => $this->flipImage($this->rotateImage($image, 90), IMG_FLIP_HORIZONTAL),
            8 => $this->rotateImage($image, 90),
            default => $image,
        };
    }

    private function createImageResource(string $path, string $mimeType): \GdImage
    {
        $resource = match ($mimeType) {
            'image/jpeg' => imagecreatefromjpeg($path),
            'image/png' => imagecreatefrompng($path),
            'image/webp' => function_exists('imagecreatefromwebp')
                ? imagecreatefromwebp($path)
                : false,
            default => false,
        };

        if ($resource === false) {
            throw new RuntimeException('Unsupported or unreadable avatar image format.');
        }

        return $resource;
    }

    private function rotateImage(\GdImage $image, int $angle): \GdImage
    {
        $rotated = imagerotate($image, $angle, 0);

        if ($rotated === false) {
            throw new RuntimeException('Unable to orient the avatar image.');
        }

        imagedestroy($image);

        return $rotated;
    }

    private function flipImage(\GdImage $image, int $mode): \GdImage
    {
        if (! imageflip($image, $mode)) {
            throw new RuntimeException('Unable to orient the avatar image.');
        }

        return $image;
    }

    private function prepareCanvas(\GdImage $canvas, string $mimeType, int $width, int $height): void
    {
        if (in_array($mimeType, ['image/png', 'image/webp'], true)) {
            imagealphablending($canvas, false);
            imagesavealpha($canvas, true);
            $transparent = imagecolorallocatealpha($canvas, 0, 0, 0, 127);
            imagefilledrectangle($canvas, 0, 0, $width, $height, $transparent);

            return;
        }

        $background = imagecolorallocate($canvas, 255, 255, 255);
        imagefilledrectangle($canvas, 0, 0, $width, $height, $background);
    }

    private function encodeImage(\GdImage $image, string $mimeType): string
    {
        ob_start();

        $encoded = match ($mimeType) {
            'image/jpeg' => imagejpeg($image, null, 85),
            'image/png' => imagepng($image, null, 6),
            'image/webp' => function_exists('imagewebp')
                ? imagewebp($image, null, 85)
                : false,
            default => false,
        };

        $contents = ob_get_clean();

        if ($encoded === false || ! is_string($contents) || $contents === '') {
            throw new RuntimeException('Unable to encode the avatar image.');
        }

        return $contents;
    }

    private function extensionForMimeType(string $mimeType): string
    {
        return match ($mimeType) {
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            default => throw new RuntimeException('Unsupported avatar image type.'),
        };
    }
}
