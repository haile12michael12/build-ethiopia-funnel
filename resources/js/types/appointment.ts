export interface AppointmentServiceOption {
    key: string;
    label_en: string;
    label_am: string | null;
}

export interface AppointmentMeetingType {
    key: string;
    label_en: string;
    label_am: string | null;
}

export interface AppointmentBookingSettings {
    timezone: string;
    business_hours: { start: string; end: string };
    slot_minutes: number;
    buffer_minutes: number;
    advance_days: number;
    max_per_day: number;
}

export interface AppointmentBookingPageProps {
    services: AppointmentServiceOption[];
    settings: AppointmentBookingSettings;
    meetingTypes: AppointmentMeetingType[];
    dates: string[];
    responseEmail: string | null;
    responseTimeHours: number | null;
    whatsappUrl: string | null;
    meetingUrl: string | null;
}

export interface AppointmentContactSummary {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    source: string;
    status: string;
}

export interface AppointmentSummary {
    id: number;
    company_name: string;
    contact_name: string;
    email: string;
    phone: string | null;
    service_key: string;
    service_label: string;
    meeting_type: string;
    start_at: string;
    start_display: string;
    timezone: string;
    status: string;
    notes: string | null;
    contact: AppointmentContactSummary | null;
}

export interface AppointmentThankYouPageProps {
    appointment: {
        id: number;
        company_name: string;
        contact_name: string;
        email: string;
        phone: string | null;
        service_key: string;
        service_label: string;
        meeting_type: string;
        meeting_type_label: string;
        start_at: string;
        start_display: string;
        timezone: string;
        duration_minutes: number;
        status: string;
        notes: string | null;
    };
    nextSteps: {
        response_email: string | null;
        whatsapp_url: string | null;
        meeting_url: string | null;
    };
}

export interface AppointmentBookingPayload {
    company_name: string;
    contact_name: string;
    email: string;
    phone?: string;
    service_key: string;
    meeting_type: string;
    date: string;
    time: string;
    notes?: string;
    market?: 'ethiopia' | 'international';
    country?: string;
    website?: string;
    marketing_consent?: boolean;
    attribution?: Record<string, string>;
}
