export interface Project {
    id: number;
    user_id: number;
    title_en: string;
    title_am?: string | null;
    slug: string;
    summary_en?: string | null;
    summary_am?: string | null;
    description_en?: string | null;
    description_am?: string | null;
    category: string;
    cover_image?: string | null;
    gallery?: string[] | null;
    technologies?: string[] | null;
    demo_url?: string | null;
    repo_url?: string | null;
    video_url?: string | null;
    status: 'draft' | 'published' | 'archived';
    is_published: boolean;
    is_featured: boolean;
    sort_order: number;
    published_at?: string | null;
    seo_title_en?: string | null;
    seo_title_am?: string | null;
    seo_description_en?: string | null;
    seo_description_am?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface CategoryItem {
    en: string;
    am: string;
}

export type CategoriesMap = Record<string, CategoryItem>;

export interface ProjectStats {
    total_projects: number;
    published_projects: number;
    draft_projects: number;
    featured_projects: number;
}

export interface PaginatedData<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
    links: Array<{
        url: string | null;
        label: string;
        active: boolean;
    }>;
}
