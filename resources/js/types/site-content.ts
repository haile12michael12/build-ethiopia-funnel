export type SiteContentType = 'service' | 'blog' | 'testimonial' | 'page';

export interface SiteContent {
    id: number;
    user_id: number;
    type: SiteContentType;
    title_en: string;
    title_am: string | null;
    slug: string;
    summary_en: string | null;
    summary_am: string | null;
    body_en: string | null;
    body_am: string | null;
    image: string | null;
    category: string | null;
    highlights: string[] | null;
    person_name_en: string | null;
    person_name_am: string | null;
    person_role_en: string | null;
    person_role_am: string | null;
    company_en: string | null;
    company_am: string | null;
    status: 'draft' | 'published' | 'archived';
    published_at: string | null;
    sort_order: number;
    seo_title_en: string | null;
    seo_title_am: string | null;
    seo_description_en: string | null;
    seo_description_am: string | null;
    created_at: string;
    updated_at: string;
}
