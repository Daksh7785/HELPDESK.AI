import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    try {
        const { email, name, company } = await req.json();
        if (!email) throw new Error('Email is required');

        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
        if (!RESEND_API_KEY) {
            console.error('RESEND_API_KEY not configured');
            return new Response(
                JSON.stringify({ error: 'Email service not configured' }),
                { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
            );
        }

        const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'HELPDESK.AI <noreply@helpdeskai.com>';
        const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'https://helpdeskaiv1.vercel.app';

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: FROM_EMAIL,
                to: [email],
                subject: 'Account Approved! Welcome to HelpDesk.ai',
                html: `
                    <h2>Hello ${name},</h2>
                    <p>Your account for <strong>${company}</strong> has been approved by your administrator!</p>
                    <p>You can now log in to the system and access your dashboard.</p>
                    <a href="${FRONTEND_URL}/dashboard" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Go to Dashboard</a>
                `
            }),
        });

        const data = await res.json();
        console.log(`Approval email sent to ${email}: ${res.status}`);
        return new Response(JSON.stringify({ success: true, message: `Approval email sent to ${email}`, data }), {
            status: res.status,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
    }
});
