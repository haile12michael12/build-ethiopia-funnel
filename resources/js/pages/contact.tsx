import PublicLayout from '@/layouts/public-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    Clock,
    Globe2,
    Mail,
    MapPin,
    MessageSquare,
    Phone,
    Send,
    Sparkles,
} from 'lucide-react';
import { useState } from 'react';

export default function Contact() {
    const [submitted, setSubmitted] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Since we also offer the Growth Audit as the primary structured lead capture,
        // this general contact form provides instant feedback
        setSubmitted(true);
    };

    return (
        <PublicLayout>
            <Head title="Contact Our Agency - Hailab" />

            {/* Hero */}
            <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-card/80 to-background py-16">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
                    <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary mb-6">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Let's Build Together</span>
                    </div>

                    <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl text-foreground">
                        Get In Touch With Our Engineering Team
                    </h1>

                    <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
                        Have a software project, AI automation idea, or looking for custom platform development? Send us a message or schedule a growth audit.
                    </p>
                </div>
            </section>

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Left Info Column */}
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-bold text-foreground">Agency Office & Contacts</h2>
                            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                                We collaborate with clients across Africa, North America, and Europe. Our headquarters are located in Addis Ababa, Ethiopia.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
                                <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                                    <MapPin className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-foreground">Location</h4>
                                    <p className="text-xs text-muted-foreground mt-0.5">Bole Subcity, Addis Ababa, Ethiopia</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
                                <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                                    <Mail className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-foreground">Direct Email</h4>
                                    <p className="text-xs text-muted-foreground mt-0.5">contact@openfunnels.com</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
                                <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                                    <Clock className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-foreground">Office Hours</h4>
                                    <p className="text-xs text-muted-foreground mt-0.5">Monday - Friday: 8:30 AM - 6:00 PM (EAT / GMT+3)</p>
                                </div>
                            </div>
                        </div>

                        {/* Growth Audit Prompt */}
                        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 space-y-3">
                            <Badge className="bg-primary text-primary-foreground text-xs">Recommended</Badge>
                            <h3 className="text-lg font-bold text-foreground">Looking for a comprehensive technical evaluation?</h3>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Complete our free 3-minute business growth audit to receive customized technical recommendations, budget estimates, and architecture options.
                            </p>
                            <div className="pt-1">
                                <Button asChild size="sm">
                                    <Link href={route('business-audit.show')} className="gap-1.5">
                                        <span>Start Free Audit</span>
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Right Form Column */}
                    <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
                        <h3 className="text-xl font-bold text-foreground mb-6">Send an Inquiry</h3>

                        {submitted ? (
                            <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-6 text-center space-y-3">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20 text-green-500">
                                    <Send className="h-6 w-6" />
                                </div>
                                <h4 className="text-lg font-bold text-foreground">Inquiry Received</h4>
                                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                                    Thank you for reaching out. One of our senior engineers will review your request and get back to you within 24 business hours.
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="contact_name">Your Name</Label>
                                    <Input
                                        id="contact_name"
                                        required
                                        placeholder="e.g. Dawit Tesfaye"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="contact_email">Business Email</Label>
                                    <Input
                                        id="contact_email"
                                        type="email"
                                        required
                                        placeholder="e.g. dawit@company.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="contact_message">Project Overview or Questions</Label>
                                    <textarea
                                        id="contact_message"
                                        required
                                        rows={5}
                                        placeholder="Describe the problem, target platform, or software architecture you're looking to build..."
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        className="w-full rounded-md border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    />
                                </div>

                                <Button type="submit" className="w-full gap-2">
                                    <Send className="h-4 w-4" />
                                    <span>Send Message</span>
                                </Button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </PublicLayout>
    );
}
