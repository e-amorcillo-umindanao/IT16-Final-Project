<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>SecureVault Audit Log</title>
    <style>
        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 11px;
            color: #111111;
            margin: 0;
            padding: 20px;
        }

        .header {
            border-bottom: 2px solid #D4A843;
            padding-bottom: 12px;
            margin-bottom: 20px;
        }

        .header h1 {
            font-size: 20px;
            color: #111111;
            margin: 0;
        }

        .header p {
            color: #666666;
            margin: 4px 0 0;
            font-size: 10px;
        }

        .meta {
            margin-bottom: 20px;
            font-size: 10px;
            color: #555555;
        }

        .meta span {
            display: inline-block;
            margin-right: 18px;
            margin-bottom: 6px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        th {
            background: #f5f5f0;
            padding: 8px;
            text-align: left;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #666666;
            border-bottom: 1px solid #dddddd;
        }

        td {
            padding: 7px 8px;
            border-bottom: 1px solid #eeeeee;
            vertical-align: top;
        }

        tr:nth-child(even) td {
            background: #fafaf8;
        }

        .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 9999px;
            font-size: 9px;
            font-weight: bold;
        }

        .badge-success {
            background: #dcfce7;
            color: #166534;
        }

        .badge-error {
            background: #fee2e2;
            color: #991b1b;
        }

        .badge-info {
            background: #fef9c3;
            color: #854d0e;
        }

        .footer {
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #eeeeee;
            font-size: 9px;
            color: #999999;
            text-align: center;
        }

        .monospace {
            font-family: DejaVu Sans Mono, monospace;
            font-size: 9px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>SecureVault - Security Audit Log</h1>
        <p>Generated on {{ now()->utc()->format('F j, Y \a\t H:i:s') }} UTC</p>
    </div>

    <div class="meta">
        <span><strong>User:</strong> {{ $userName }}</span>
        <span><strong>Total Entries:</strong> {{ $logs->count() }}</span>
        @if($dateRange)
            <span><strong>Period:</strong> {{ $dateRange }}</span>
        @endif
    </div>

    <table>
        <thead>
            <tr>
                <th style="width:18%">Timestamp</th>
                @if($isAdmin)
                    <th style="width:18%">User</th>
                @endif
                <th style="width:20%">Action</th>
                <th style="width:30%">Details</th>
                <th style="width:14%">IP Address</th>
            </tr>
        </thead>
        <tbody>
            @foreach($logs as $log)
                <tr>
                    <td class="monospace">{{ $log->created_at?->format('M d, Y H:i:s') }}</td>
                    @if($isAdmin)
                        <td>{{ $log->user?->name ?? 'System' }}</td>
                    @endif
                    <td>
                        @php
                            $actionClass = match (true) {
                                str_contains($log->action, 'success'),
                                str_contains($log->action, 'enabled'),
                                str_contains($log->action, 'upload'),
                                str_contains($log->action, 'starred') => 'badge-success',
                                str_contains($log->action, 'failed'),
                                str_contains($log->action, 'locked'),
                                str_contains($log->action, 'violation') => 'badge-error',
                                default => 'badge-info',
                            };
                        @endphp
                        <span class="badge {{ $actionClass }}">
                            {{ strtoupper(str_replace('_', ' ', $log->action)) }}
                        </span>
                    </td>
                    <td>
                        {{ $log->metadata['document_name']
                            ?? $log->metadata['shared_with']
                            ?? $log->metadata['reason']
                            ?? '-' }}
                    </td>
                    <td class="monospace">{{ $log->ip_address ?? '-' }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="footer">
        SecureVault · AES-256-CBC Encrypted · HMAC-SHA256 Audit Chain · Confidential
    </div>
</body>
</html>
