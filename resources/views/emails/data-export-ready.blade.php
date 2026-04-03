<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Your SecureVault data export is ready</title>
</head>
<body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
    <p>Hello {{ $user->name }},</p>

    <p>Your SecureVault personal data export is ready.</p>

    <p>
        <a href="{{ $downloadUrl }}">Download your export</a>
    </p>

    <p>This signed link expires in 24 hours and can be used once.</p>

    <p>If you did not request this export, please contact your administrator.</p>
</body>
</html>
