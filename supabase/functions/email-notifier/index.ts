import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0"

// Standard Supabase Secrets (automatically provided in the platform)
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// User Defined Secrets
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FROM_EMAIL = "HELPDESK.AI <bonthalamadhavi1@gmail.com>";

serve(async (req) => {
  try {
    // 1. Initial Validation
    if (!RESEND_API_KEY) {
      throw new Error("Missing RESEND_API_KEY environment variable.");
    }

    const payload = await req.json();
    const record = payload.record;

    if (!record || !record.id) {
      return new Response(JSON.stringify({ error: "Missing record or record ID in payload." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Initialize Supabase Client
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error("Missing Supabase Service Credentials.");
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 3. Resolve Recipient Email
    let recipientEmail = "support@helpdeskai.com"; // Fallback recipient
    if (record.user_id) {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(record.user_id);
      if (!userError && userData?.user?.email) {
        recipientEmail = userData.user.email;
      } else {
        console.warn(`[email-notifier] Using fallback email. user_id: ${record.user_id}, Error: ${userError?.message}`);
      }
    }

    // 4. Prepare Metadata for Email
    const ticketId = record.id?.toString().slice(0, 8).toUpperCase() || "NEW-TICKET";
    const subject = record.subject || "No Subject Provided";
    const category = record.category || "General";
    const subcategory = record.subcategory || "Other";
    const priority = record.priority || "Medium";
    const assignedTeam = record.assigned_team || "Support Queue";
    const statusText = (record.status || "pending").replace(/_/g, " ");
    const ticketUrl = `https://helpdeskaiv1.vercel.app/ticket/${record.id}`;

    const priorityColors: Record<string, string> = {
      Critical: "#ef4444",
      High: "#f97316",
      Medium: "#f59e0b",
      Low: "#10b981",
    };
    const themeColor = priorityColors[priority] || "#6366f1";

    // 5. Construct Premium Responsive HTML
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:ffffff;border-radius:24px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px 40px; text-align: center;">
              <h1 style="color:#ffffff; margin:0; font-size:28px; font-weight:900; letter-spacing:-0.02em;">HELPDESK<span style="color:#10b981;">.AI</span></h1>
              <p style="color:#64748b; margin:8px 0 0; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.2em;">Automated Support Intelligence</p>
            </td>
          </tr>

          <!-- Confirmation Banner -->
          <tr>
            <td style="padding: 24px 40px; border-bottom: 1px solid #f1f5f9; background-color: #f8fafc; text-align: center;">
              <div style="display:inline-block; padding: 6px 12px; background-color: #ecfdf5; border-radius: 999px; border: 1px solid #d1fae5;">
                <p style="margin:0; color:#065f46; font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:0.15em;">✨ Ticket Request Received</p>
              </div>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="color:#334155; font-size:16px; margin: 0 0 24px;">Hello,</p>
              <p style="color:#64748b; font-size:16px; line-height:1.7; margin: 0 0 40px;">
                Your support request has been successfully captured. Our AI is currently analyzing your issue to route it to the 
                most qualified agent or provide an automatic resolution.
              </p>

              <!-- Ticket Info Box -->
              <div style="background-color: #0f172a; border-radius: 20px; padding: 32px; margin-bottom: 40px;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.08);">
                      <p style="margin:0; color:rgba(255,255,255,0.4); font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.25em;">Tracking Reference</p>
                      <h2 style="margin:4px 0 0; color:#ffffff; font-size:28px; font-weight:900; letter-spacing:0.1em; font-family: 'Courier New', Courier, monospace;">#${ticketId}</h2>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top: 24px;">
                      <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="width: 50%; padding-right: 10px;">
                            <p style="margin:0; color:rgba(255,255,255,0.4); font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.15em;">Category</p>
                            <p style="margin:4px 0 0; color:#ffffff; font-size:14px; font-weight:700;">${category}</p>
                          </td>
                          <td style="width: 50%;">
                            <p style="margin:0; color:rgba(255,255,255,0.4); font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.15em;">Priority</p>
                            <div style="margin-top:6px;"><span style="background-color:${themeColor}; color:#ffffff; padding: 3px 10px; border-radius:6px; font-size:11px; font-weight:900; text-transform:uppercase;">${priority}</span></div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- CTA -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${ticketUrl}" style="display:inline-block; background-color:#10b981; color:#ffffff; padding: 18px 40px; border-radius: 16px; text-decoration:none; font-size:14px; font-weight:900; text-transform:uppercase; letter-spacing:0.15em; box-shadow: 0 12px 24px rgba(16,185,129,0.2);">
                      View Ticket Life-Cycle →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc; padding:32px; text-align:center; border-top: 1px solid #f1f5f9;">
              <p style="margin:0; color:#94a3b8; font-size:12px; font-weight:600;">
                You are receiving this because a ticket was created under your account.<br>
                Powered by HELPDESK.AI Neural Support Engine
              </p>
            </td>
          </tr>
        </table>
        
        <p style="margin-top:24px; color:#94a3b8; font-size:11px; text-align:center;">
          &copy; 2026 HELPDESK.AI. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // 6. Execute Send Request to Resend API
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [recipientEmail],
        subject: `[HELPDESK.AI] Support Ticket #${ticketId} Received`,
        html: html,
      }),
    });

    const sendStatus = resendResponse.status;
    const sendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error(`[email-notifier] Resend failed (${sendStatus}):`, JSON.stringify(sendData));
      return new Response(JSON.stringify({ error: sendData }), {
        status: sendStatus,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`[email-notifier] ✅ Dispatched to ${recipientEmail}. ID: ${sendData.id}`);
    return new Response(JSON.stringify({ success: true, id: sendData.id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error(`[email-notifier] Fatal Exception: ${error.message}`);
    return new Response(JSON.stringify({ error: "Internal processing error." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
