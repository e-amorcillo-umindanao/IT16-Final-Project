import { Config } from 'ziggy-js';

export interface User {
    id: number;
    name: string;
    email: string;
    avatar_url?: string | null;
    email_verified_at?: string;
    two_factor_secret?: string;
    two_factor_recovery_codes?: string;
    two_factor_confirmed_at?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Document {
    id: number;
    user_id: number;
    original_name: string;
    encrypted_name: string;
    file_size: number;
    mime_type: string;
    hmac_hash: string;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}

export interface DocumentShare {
    id: number;
    document_id: number;
    owner_id: number;
    shared_with_user_id?: number;
    shared_with_email: string;
    permission_level: 'view_only' | 'download' | 'full_access';
    expires_at?: string;
    created_at: string;
    updated_at: string;
    document?: Document;
}

export interface AuditLog {
    id: number;
    user_id?: number;
    document_id?: number;
    action: string;
    category?: 'security' | 'audit';
    table_name?: string;
    record_id?: number;
    old_values?: any;
    new_values?: any;
    metadata?: any;
    ip_address?: string;
    user_agent?: string;
    previous_hash?: string;
    current_hash: string;
    created_at: string;
    user?: User;
}

export interface Session {
    id: string;
    user_id: number | null;
    ip_address: string | null;
    user_agent: string | null;
    payload: string;
    last_activity: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    current_page: number;
    first_page_url: string;
    from: number | null;
    last_page: number;
    last_page_url: string;
    links: Array<{ url: string | null; label: string; active: boolean }>;
    next_page_url: string | null;
    path: string;
    per_page: number;
    prev_page_url: string | null;
    to: number | null;
    total: number;
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
        roles?: string[];
        permissions?: string[];
    };
    flash?: {
        success?: string | null;
        error?: string | null;
    };
    ziggy: Config & { location: string };
};
