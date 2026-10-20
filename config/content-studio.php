<?php

return [
    'prompt_template_key' => 'agency-marketing-v1',
    'prompt_template' => 'Write {content_type} for {platform} in {language}. The audience is {audience}; market is {market}; service is {service}; objective is {objective}; tone is {tone}; format is {format}. Suggested call to action: {call_to_action}. Follow the configured brand voice and guidelines. Use only supplied verified facts.',
    'content_types' => [
        'linkedin_post' => 'LinkedIn post',
        'facebook_post' => 'Facebook post',
        'instagram_caption' => 'Instagram caption',
        'short_video_script' => 'Short-video script',
        'youtube_shorts_concept' => 'YouTube Shorts concept',
        'portfolio_description' => 'Portfolio project description',
        'case_study' => 'Case study',
        'service_landing_copy' => 'Service landing-page copy',
        'email_draft' => 'Email draft',
    ],
    'platforms' => [
        'linkedin' => 'LinkedIn',
        'facebook' => 'Facebook',
        'instagram' => 'Instagram',
        'tiktok' => 'TikTok',
        'youtube' => 'YouTube',
        'website' => 'Website',
        'email' => 'Email',
        'other' => 'Other / export',
    ],
    'formats' => [
        'post' => 'Post',
        'caption' => 'Caption',
        'short_video_script' => 'Short-video script',
        'shorts_concept' => 'Shorts concept',
        'case_study' => 'Case study',
        'landing_page' => 'Landing-page copy',
        'email' => 'Email',
    ],
    'objectives' => [
        'awareness' => 'Awareness',
        'engagement' => 'Engagement',
        'education' => 'Education',
        'inquiries' => 'Inquiries',
        'portfolio' => 'Portfolio',
    ],
];
