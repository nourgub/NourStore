// Per-page <title>/description/Open Graph updates — the static tags in
// index.html are the fallback for the first page and for crawlers that don't
// execute JS; a page with its own title (a lesson, for example) sets it here
// so a shared WhatsApp link or a browser tab names the page. Only public
// text ever goes here, never protected content.

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
 * a page's cleanup (useEffect return) so navigating away from a page with
 * its own title doesn't leave that title active on the next page.
 */
export function resetDocumentMeta() {
  setDocumentMeta({
    title: "تفوّق Tafawoq — أستاذك الذكي للبكالوريا",
    description:
      "تفوّق (Tafawoq) — منصة التحضير لشهادة البكالوريا في الجزائر: دروس وتمارين واختبارات وبكالوريا تجريبية، أستاذ ذكي يشرح بالصوت، وحصص مع أساتذة. للعلوم التجريبية والآداب والفلسفة واللغات الأجنبية.",
  });
}
