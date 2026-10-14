<?php

namespace Database\Seeders;

use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Seeder;

class ProjectSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $user = User::query()->first() ?? User::factory()->create([
            'name' => 'Agency Administrator',
            'email' => 'admin@openfunnels.test',
        ]);

        $projects = [
            [
                'title_en' => 'NexusAI — Intelligent Workflow & Customer Support Agent',
                'title_am' => 'ኔክሰስ ኤአይ — የማሰብ ችሎታ ያለው የስራ ፍሰት እና የደንበኞች ድጋፍ ኤጀንት',
                'slug' => 'nexus-ai-workflow-agent',
                'summary_en' => 'Autonomous LLM-driven customer agent that triages incoming leads, verifies account context, and executes backend operations automatically.',
                'summary_am' => 'የደንበኞችን ጥያቄዎች የሚመልስ፣ መረጃዎችን የሚያጣራ እና ውስብስብ የስራ ፍሰቶችን በራሱ የሚያከናውን ብልህ አርቴፊሻል ኢንተለጀንስ ስርዓት።',
                'description_en' => "NexusAI was developed to reduce tier-1 support response times from hours to seconds.\n\nKey architectural pillars:\n- Integrated OpenAI GPT-4o with streaming function calling.\n- Retrieval-Augmented Generation (RAG) powered by pgvector for enterprise knowledge base search.\n- Real-time WebSockets synchronization for seamless human-in-the-loop escalation.\n- Strict guardrails preventing prompt injection and data exfiltration.",
                'description_am' => "ኔክሰስ ኤአይ የደንበኞች አገልግሎት ፍጥነትን ከሰዓታት ወደ ሰከንዶች ለመቀነስ የተሰራ ስርዓት ነው።\n\nዋና ዋና የቴክኖሎጂ ገጽታዎች:\n- በOpenAI እና LLM ሞዴሎች የተደገፈ የቀጥታ ምላሽ መስጫ\n- የድርጅቱን የዕውቀት ማዕከል (Knowledge Base) ተጠቅሞ ትክክለኛ መረጃ የመስጠት አቅም\n- ሰው ጣልቃ መግባት በሚያስፈልግበት ጊዜ ፈጣን የማሳወቂያ ስርዓት",
                'category' => 'ai_automation',
                'technologies' => ['OpenAI', 'Python', 'FastAPI', 'Laravel', 'React', 'Redis', 'Tailwind CSS'],
                'demo_url' => 'https://demo.nexusai.example.com',
                'repo_url' => 'https://github.com/aialvi/nexus-ai-agent',
                'video_url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                'status' => 'published',
                'is_published' => true,
                'is_featured' => true,
                'sort_order' => 1,
                'published_at' => now()->subDays(10),
            ],
            [
                'title_en' => 'MetricPulse — Multi-Tenant SaaS Analytics Dashboard',
                'title_am' => 'ሜትሪክ ፐልስ — ባለብዙ ተከራይ (Multi-Tenant) የትንታኔ ዳሽቦርድ',
                'slug' => 'metricpulse-saas-analytics-dashboard',
                'summary_en' => 'High-throughput subscription platform tracking revenue churn, user engagement metrics, and cohort retention for modern B2B SaaS companies.',
                'summary_am' => 'ለንግድ ድርጅቶች የደንበኞችን አጠቃቀም፣ የገቢ ሁኔታ እና የደንበኞችን ቆይታ የሚተነትን ዘመናዊ የSaaS መተግበሪያ።',
                'description_en' => "MetricPulse empowers digital product owners with real-time financial and funnel analytics.\n\nHighlights:\n- Multi-tenant architecture with isolated schema databases.\n- Automated Stripe webhook synchronization with idempotency keys.\n- Interactive charts rendered with SVG and Canvas for 60fps responsiveness.\n- Granular role-based access control (RBAC).",
                'description_am' => "ሜትሪክ ፐልስ የዲጂታል ምርት ባለቤቶች የንግድ እንቅስቃሴያቸውን በቀላሉ እንዲከታተሉ የሚያስችል ስርዓት ነው።\n\nልዩ ገጽታዎች:\n- የተሟላ የክፍያ ስርዓት (Stripe) ትስስር\n- በከፍተኛ ፍጥነት የሚሰሩ የቀጥታ ግራፎች እና ሪፖርቶች\n- ለእያንዳንዱ ሰራተኛ የተከፋፈለ የስልጣን እርከን",
                'category' => 'saas',
                'technologies' => ['Laravel', 'Inertia.js', 'React', 'TypeScript', 'PostgreSQL', 'Tailwind CSS', 'Stripe'],
                'demo_url' => 'https://pulse.example.com',
                'repo_url' => 'https://github.com/aialvi/metric-pulse-saas',
                'video_url' => null,
                'status' => 'published',
                'is_published' => true,
                'is_featured' => true,
                'sort_order' => 2,
                'published_at' => now()->subDays(7),
            ],
            [
                'title_en' => 'AddisMarket — Multi-Vendor E-Commerce Marketplace',
                'title_am' => 'አዲስ ማርኬት — ባለብዙ ሻጭ የኢ-ኮሜርስ የገበያ ስርዓት',
                'slug' => 'addismarket-multivendor-ecommerce',
                'summary_en' => 'Full-fledged localized marketplace connecting local merchants with consumers featuring Telebirr/Chapa payment gateways and real-time inventory.',
                'summary_am' => 'የአካባቢ ነጋዴዎችን እና ገዢዎችን የሚያገናኝ፣ የቴሌብር እና ቻፓ ክፍያዎችን ያካተተ የተሟላ የኢ-ኮሜርስ የገበያ መድረክ።',
                'description_en' => "AddisMarket was engineered to deliver lightning-fast e-commerce shopping in Ethiopia.\n\nTechnical stack:\n- Vendor storefront management with custom inventory tracking.\n- Native integration with Ethiopian payment providers (Telebirr, Chapa, CBE Birr).\n- Elastic full-text search with phonetic Amharic transliteration matching.\n- Mobile-optimized responsive layout.",
                'description_am' => "አዲስ ማርኬት በኢትዮጵያ ውስጥ ፈጣን እና አስተማማኝ የመስመር ላይ ግብይትን ለማስፈጸም የተሰራ ነው።\n\nዋና ዋና ባህሪያት:\n- የሻጮች እና የሸቀጦች አስተዳደር\n- የቴሌብር፣ ቻፓ እና ሲቢኢ ብር ክፍያዎች ውህደት\n- በአማርኛ እና በእንግሊዝኛ በቀላሉ የሚሰራ የፍለጋ ሞተር",
                'category' => 'ecommerce',
                'technologies' => ['Next.js', 'Laravel', 'REST API', 'MySQL', 'Redis', 'Chapa', 'Telebirr'],
                'demo_url' => 'https://addismarket.example.com',
                'repo_url' => null,
                'video_url' => null,
                'status' => 'published',
                'is_published' => true,
                'is_featured' => true,
                'sort_order' => 3,
                'published_at' => now()->subDays(5),
            ],
            [
                'title_en' => 'EthioCareers — Job Portal & Talent Directory',
                'title_am' => 'ኢትዮ ካሪየርስ — የስራ እና የባለሙያዎች መረጃ ፖርታል',
                'slug' => 'ethiocareers-job-portal-directory',
                'summary_en' => 'Modern recruitment platform connecting top software engineers, designers, and managers with global and local opportunities.',
                'summary_am' => 'የቴክኖሎጂ ባለሙያዎችን እና አሰሪዎችን በቀላሉ የሚያገናኝ ዘመናዊ የስራ ማስታወቂያ እና ምልመላ መድረክ።',
                'description_en' => 'EthioCareers streamlines technical hiring with structured resumes, applicant tracking workflows, and skill assessments.',
                'description_am' => 'ኢትዮ ካሪየርስ ብቁ ሰራተኞችን ለማግኘት እና ለማስተዳደር የሚረዳ የስራ ፖርታል ነው።',
                'category' => 'directory',
                'technologies' => ['React', 'Laravel', 'TypeScript', 'Tailwind CSS', 'SQLite'],
                'demo_url' => 'https://careers.example.com',
                'repo_url' => 'https://github.com/aialvi/ethio-careers',
                'video_url' => null,
                'status' => 'published',
                'is_published' => true,
                'is_featured' => false,
                'sort_order' => 4,
                'published_at' => now()->subDays(3),
            ],
            [
                'title_en' => 'OmniFlow CRM — Pipeline & Lead Automation Engine',
                'title_am' => 'ኦምኒፍሎ CRM — የሽያጭ እና የደንበኞች አውቶሜሽን ስርዓት',
                'slug' => 'omniflow-crm-pipeline-engine',
                'summary_en' => 'Visual kanban deal pipeline with automated SMS/email triggers, conversion attribution tracking, and meeting schedulers.',
                'summary_am' => 'የሽያጭ ሂደቶችን በካንባን ቦርድ ለማስተዳደር እና የደንበኞች ግንኙነትን በራስ-ሰር ለመምራት የተዘጋጀ ስርዓት።',
                'description_en' => 'OmniFlow combines CRM ease-of-use with robust workflow automation pipelines.',
                'description_am' => 'ኦምኒፍሎ የሽያጭ ሰራተኞች በቀላሉ ደንበኞቻቸውን እንዲከታተሉ የሚያደርግ ሲስተም ነው።',
                'category' => 'crm',
                'technologies' => ['Laravel', 'Inertia.js', 'React', 'Tailwind CSS', 'PostgreSQL'],
                'demo_url' => null,
                'repo_url' => 'https://github.com/aialvi/omniflow-crm',
                'video_url' => null,
                'status' => 'published',
                'is_published' => true,
                'is_featured' => false,
                'sort_order' => 5,
                'published_at' => now()->subDays(2),
            ],
            [
                'title_en' => 'SecureGateway — Microservices API & Banking Integration',
                'title_am' => 'ሴኪዩር ጌትዌይ — የማይክሮሰርቪስ ኤፒአይ እና የባንክ ውህደት',
                'slug' => 'secure-gateway-banking-api',
                'summary_en' => 'Resilient API middleware handling encrypted payload signing, rate-limiting, and webhook retries between core banking systems and fintech apps.',
                'summary_am' => 'በዋና የባንክ ስርዓቶች እና በፊንቴክ መተግበሪያዎች መካከል ደህንነቱ የተጠበቀ የኤፒአይ ግንኙነትን የሚያረጋግጥ ስርዓት።',
                'description_en' => 'Engineered for high-volume banking transactions with sub-50ms latency and 99.99% uptime SLA.',
                'description_am' => 'ለባንክ እና ለክፍያ ስርዓቶች ፈጣን እና ደህንነቱ የተጠበቀ የኤፒአይ ድልድይ ሆኖ የሚያገለግል ነው።',
                'category' => 'custom_software',
                'technologies' => ['Laravel', 'Docker', 'Redis', 'Kafka', 'PostgreSQL'],
                'demo_url' => null,
                'repo_url' => null,
                'video_url' => null,
                'status' => 'published',
                'is_published' => true,
                'is_featured' => false,
                'sort_order' => 6,
                'published_at' => now()->subDay(),
            ],
        ];

        foreach ($projects as $projectData) {
            Project::query()->updateOrCreate(
                ['slug' => $projectData['slug']],
                array_merge($projectData, ['user_id' => $user->id])
            );
        }
    }
}
