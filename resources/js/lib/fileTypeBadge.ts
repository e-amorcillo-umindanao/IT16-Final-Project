export type FileType =
    | 'pdf'
    | 'docx'
    | 'doc'
    | 'xlsx'
    | 'xls'
    | 'image'
    | 'png'
    | 'jpg'
    | 'jpeg'
    | 'gif'
    | 'webp'
    | 'unknown';

interface BadgeConfig {
    label: string;
    className: string;
}

const FILE_TYPE_CONFIG: Record<FileType, BadgeConfig> = {
    pdf: {
        label: 'PDF',
        className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-transparent',
    },
    docx: {
        label: 'DOCX',
        className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-transparent',
    },
    doc: {
        label: 'DOC',
        className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-transparent',
    },
    xlsx: {
        label: 'XLSX',
        className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-transparent',
    },
    xls: {
        label: 'XLS',
        className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-transparent',
    },
    image: {
        label: 'IMAGE',
        className: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-transparent',
    },
    png: {
        label: 'PNG',
        className: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-transparent',
    },
    jpg: {
        label: 'JPG',
        className: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-transparent',
    },
    jpeg: {
        label: 'JPG',
        className: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-transparent',
    },
    gif: {
        label: 'IMAGE',
        className: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-transparent',
    },
    webp: {
        label: 'IMAGE',
        className: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-transparent',
    },
    unknown: {
        label: 'FILE',
        className: 'bg-muted text-muted-foreground border-transparent',
    },
};

export function getFileTypeBadgeConfig(mimeType: string): BadgeConfig {
    const mime = mimeType.toLowerCase();

    if (mime === 'application/pdf') return FILE_TYPE_CONFIG.pdf;
    if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return FILE_TYPE_CONFIG.docx;
    if (mime === 'application/msword') return FILE_TYPE_CONFIG.doc;
    if (mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return FILE_TYPE_CONFIG.xlsx;
    if (mime === 'application/vnd.ms-excel') return FILE_TYPE_CONFIG.xls;
    if (mime.startsWith('image/png')) return FILE_TYPE_CONFIG.png;
    if (mime.startsWith('image/jpg')) return FILE_TYPE_CONFIG.jpg;
    if (mime.startsWith('image/jpeg')) return FILE_TYPE_CONFIG.jpg;
    if (mime.startsWith('image/gif')) return FILE_TYPE_CONFIG.gif;
    if (mime.startsWith('image/webp')) return FILE_TYPE_CONFIG.webp;
    if (mime.startsWith('image/')) return FILE_TYPE_CONFIG.image;

    return FILE_TYPE_CONFIG.unknown;
}
