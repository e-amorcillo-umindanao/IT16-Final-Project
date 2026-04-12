<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Server Error - SecureVault</title>
    <style>
        body {
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #111111;
            color: #faf7f0;
            font-family: "Segoe UI", sans-serif;
        }

        .container {
            max-width: 480px;
            padding: 40px 32px;
            text-align: center;
        }

        h1 {
            margin: 0 0 12px;
            font-size: 56px;
            color: #d4a843;
        }

        p {
            margin: 0 0 24px;
            color: #d6d0c2;
            line-height: 1.6;
        }

        a {
            color: #d4a843;
            text-decoration: none;
            border-bottom: 1px solid #d4a843;
            padding-bottom: 2px;
        }
    </style>
</head>
<body>
    <main class="container">
        <h1>500</h1>
        <p>{{ $message ?? 'An unexpected error occurred. Please try again later.' }}</p>
        <a href="{{ url('/') }}">Return to SecureVault</a>
    </main>
</body>
</html>
