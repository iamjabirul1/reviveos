import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// 1x1 transparent GIF pixel
const PIXEL_GIF = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00,
  0x80, 0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21,
  0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00,
  0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
  0x01, 0x00, 0x3b,
]);

serve(async (req) => {
  const url = new URL(req.url);
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const messageId = url.searchParams.get("mid");
  const action = url.searchParams.get("action"); // "open" or "click"
  const redirect = url.searchParams.get("url"); // for click tracking

  if (!messageId) {
    return new Response("Missing message ID", { status: 400 });
  }

  try {
    if (action === "open") {
      // Record open event (only first open)
      await supabase
        .from("messages")
        .update({ opened_at: new Date().toISOString() })
        .eq("id", messageId)
        .is("opened_at", null);

      // Return tracking pixel
      return new Response(PIXEL_GIF, {
        headers: {
          "Content-Type": "image/gif",
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      });
    }

    if (action === "click" && redirect) {
      // Record click event (only first click)
      await supabase
        .from("messages")
        .update({ clicked_at: new Date().toISOString() })
        .eq("id", messageId)
        .is("clicked_at", null);

      // Redirect to actual URL
      return new Response(null, {
        status: 302,
        headers: { Location: redirect },
      });
    }

    return new Response("Invalid action", { status: 400 });
  } catch (e) {
    console.error("email-tracking error:", e);
    // Still return pixel/redirect even on DB error so user experience isn't broken
    if (action === "open") {
      return new Response(PIXEL_GIF, {
        headers: { "Content-Type": "image/gif" },
      });
    }
    if (action === "click" && redirect) {
      return new Response(null, {
        status: 302,
        headers: { Location: redirect },
      });
    }
    return new Response("Error", { status: 500 });
  }
});
