<?php

namespace App\Enums;

enum AuditCategory: string
{
    case Security = 'security';
    case Audit = 'audit';
}
