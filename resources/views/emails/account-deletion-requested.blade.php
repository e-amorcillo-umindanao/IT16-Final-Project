<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Account deletion scheduled</title>
</head>
<body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
    <p>Hello {{ $user->name }},</p>

    <p>Your SecureVault account deletion request has been received.</p>

    <p>Your account is now deactivated and is scheduled for permanent deletion on {{ $scheduledFor->toFormattedDateString() }}.</p>

    <p>
        If this was a mistake, you can cancel the deletion request here:
        <a href="{{ $cancelUrl }}">Cancel account deletion</a>
    </p>

    <p>This cancellation link remains valid until the scheduled deletion date.</p>
</body>
</html>
