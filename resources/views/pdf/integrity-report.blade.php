<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>SecureVault Audit Integrity Report</title>
    <style>
        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 12px;
            color: #111111;
            margin: 40px;
        }

        h1 {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 4px;
        }

        h2 {
            font-size: 13px;
            margin-top: 24px;
        }

        .subtitle {
            color: #5a5a55;
            font-size: 11px;
            margin-bottom: 24px;
        }

        .header-bar {
            background: #b8860b;
            height: 4px;
            margin-bottom: 20px;
            border-radius: 2px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
        }

        th {
            text-align: left;
            font-size: 10px;
            color: #5a5a55;
            border-bottom: 1px solid #d5d5d0;
            padding: 4px 8px;
        }

        td {
            padding: 6px 8px;
            border-bottom: 1px solid #e4e4df;
            font-size: 11px;
            vertical-align: top;
        }

        .pass {
            color: #3b6d11;
            font-weight: bold;
        }

        .fail {
            color: #b33a3a;
            font-weight: bold;
        }

        .mono {
            font-family: DejaVu Sans Mono, monospace;
            font-size: 9px;
        }

        .meta {
            color: #5a5a55;
            font-size: 10px;
            margin-top: 32px;
        }
    </style>
</head>
<body>
    <div class="header-bar"></div>
    <h1>SecureVault - Audit Integrity Report</h1>
    <div class="subtitle">
        Verified {{ $timestamp }} by {{ $verifier }}
    </div>

    <table>
        <tr>
            <th>Field</th>
            <th>Value</th>
        </tr>
        <tr>
            <td>Verification mode</td>
            <td>{{ $mode === 'recent' ? 'Recent 500' : 'Full chain' }}</td>
        </tr>
        <tr>
            <td>Entries checked</td>
            <td>{{ $checked }}</td>
        </tr>
        <tr>
            <td>Entries passed</td>
            <td class="pass">{{ $passed }}</td>
        </tr>
        <tr>
            <td>Entries failed</td>
            <td class="{{ $failed > 0 ? 'fail' : 'pass' }}">{{ $failed }}</td>
        </tr>
        <tr>
            <td>Overall result</td>
            <td class="{{ $failed === 0 ? 'pass' : 'fail' }}">
                {{ $failed === 0 ? 'PASS - Chain intact' : 'FAIL - Tampering detected' }}
            </td>
        </tr>
    </table>

    @if(count($failures) > 0)
        <h2>Failure details</h2>
        <table>
            <tr>
                <th>Entry ID</th>
                <th>Failure Type</th>
                <th>Expected hash</th>
                <th>Stored hash</th>
            </tr>
            @foreach($failures as $failure)
                <tr>
                    <td>{{ $failure['id'] }}</td>
                    <td>{{ strtoupper(str_replace('_', ' ', $failure['failure_type'] ?? 'unknown')) }}</td>
                    <td class="mono">{{ $failure['expected_hash'] ?? '-' }}</td>
                    <td class="mono {{ ($failure['failure_type'] ?? null) ? 'fail' : '' }}">
                        {{ $failure['stored_hash'] ?? '-' }}
                    </td>
                </tr>
            @endforeach
        </table>
    @endif

    <div class="meta">
        SecureVault | University of Mindanao, Matina Campus | HMAC-SHA256 hash chain verification
    </div>
</body>
</html>
