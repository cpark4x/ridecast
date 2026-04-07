
import { Resend } from 'resend';

const FROM_EMAIL = 'Ridecast <onboarding@ridecast.app>';

// Lazy singleton — avoids throwing at module-eval time when RESEND_API_KEY
// is absent in the build environment (Next.js evaluates route modules at
// build time to collect page data, before env vars are fully resolved).
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export async function sendBookmarkletEmail(to: string, appUrl: string): Promise<{ success: boolean; error?: string }> {
  // Build the bookmarklet JS string (same one used in src/app/pocket/page.tsx)
  const bookmarkletJs = `javascript:(function(){var w=window.open('${appUrl}/save?url='+encodeURIComponent(location.href)+'&title='+encodeURIComponent(document.title),'ridecast_save','width=480,height=280,left='+(screen.width/2-240)+',top='+(screen.height/2-140));if(!w){location.href='${appUrl}/save?url='+encodeURIComponent(location.href)+'&title='+encodeURIComponent(document.title);}})()`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">

    <!-- Header -->
    <div style="padding:32px 32px 24px;text-align:center;">
      <div style="display:inline-block;width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#EA580C,#F97316);margin-bottom:16px;"></div>
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#18181a;">Save articles from your browser</h1>
      <p style="margin:8px 0 0;font-size:15px;color:#6b7280;line-height:1.5;">
        Drag the button below to your bookmarks bar. Then click it on any article to save it to Ridecast.
      </p>
    </div>

    <!-- Bookmarklet -->
    <div style="padding:0 32px 24px;text-align:center;">
      <div style="background:#fafafa;border:2px dashed #e5e7eb;border-radius:12px;padding:24px;">
        <a href="${bookmarkletJs}"
           style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#EA580C,#F97316);color:#fff;font-weight:600;font-size:15px;border-radius:10px;text-decoration:none;cursor:grab;">
          Save to Ridecast
        </a>
        <p style="margin:12px 0 0;font-size:13px;color:#9ca3af;">
          &#8593; Drag this to your bookmarks bar
        </p>
      </div>
    </div>

    <!-- Instructions -->
    <div style="padding:0 32px 32px;">
      <h2 style="margin:0 0 12px;font-size:15px;font-weight:600;color:#18181a;">How it works</h2>
      <div style="font-size:14px;color:#6b7280;line-height:1.6;">
        <p style="margin:0 0 8px;"><strong style="color:#18181a;">1.</strong> Drag "Save to Ridecast" to your bookmarks bar</p>
        <p style="margin:0 0 8px;"><strong style="color:#18181a;">2.</strong> Visit any article you want to listen to</p>
        <p style="margin:0;"><strong style="color:#18181a;">3.</strong> Click the bookmarklet &mdash; it saves to your Ridecast library</p>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding:16px 32px;background:#fafafa;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">
        Ridecast &mdash; Your articles, finally heard.
      </p>
    </div>
  </div>
</body>
</html>`;

  try {
    const { error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to,
      subject: 'Save articles to Ridecast from your browser',
      html,
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    console.error('Failed to send bookmarklet email:', err);
    return { success: false, error: 'Failed to send email' };
  }
}
