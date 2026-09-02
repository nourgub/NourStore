// Real per-page <title>/description/Open Graph updates — the static tags
// in index.html are the correct fallback for the landing page and for
// crawlers that don't execute JS, but a course page ("رياضيات BEM —
// المعادلات من الدرجة الأولى | Nourix Academy") showing the generic site
// title in a shared WhatsApp link or a browser tab is a real, missed SEO
// and shareability opportunity. This never touches anything the server
// hasn't already decided is public (a course's own title/description) —
// no protected content is ever put here.

function setMetaTag(selector: string, attr: "content", value: string) {
  const el = document.head.querySelector(selector);
  if (el) el.setAttribute(attr, value);
}

export function setDocumentMeta(input: {
  title: string;
  description?: string;
  image?: string;
}) {
  document.title = input.title;
  setMetaTag('meta[name="description"]', "content", input.description ?? "");
  setMetaTag('meta[property="og:title"]', "content", input.title);
  if (input.description) {
    setMetaTag(
      'meta[property="og:description"]',
      "content",
      input.description
    );
    setMetaTag('meta[name="twitter:description"]', "content", input.description);
  }
  setMetaTag('meta[name="twitter:title"]', "content", input.title);
  if (input.image) {
    setMetaTag('meta[property="og:image"]', "content", input.image);
    setMetaTag('meta[name="twitter:image"]', "content", input.image);
  }
}

/**
 * Resets to the site-wide defaults already in index.html — call this from
 * a page's cleanup (useEffect return) so navigating away from a course
 * page doesn't leave its title/description active on, say, the dashboard.
 */
export function resetDocumentMeta() {
  setDocumentMeta({
    title: "Nourix Academy – نوريكس أكاديمي",
    description:
      "Nourix Academy — منصة تعليم إلكتروني للسوق الجزائرية، تدعم العربية والفرنسية والإنجليزية، وتركز على الرياضيات والإعلام الآلي — من التأسيس إلى التحضير لشهادتي BEM وBAC.",
  });
}
