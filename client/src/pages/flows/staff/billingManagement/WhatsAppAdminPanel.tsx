import { useState } from "react";
import { Check, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { type Lang } from "../../shared";

export function WhatsAppAdminPanel({ lang }: { lang: Lang }) {
  const current = trpc.platform.whatsapp.useQuery();
  const [number, setNumber] = useState("");
  const save = trpc.platform.setWhatsapp.useMutation({
    onSuccess: () => current.refetch(),
  });
  const social = trpc.platform.socialLinks.useQuery();
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const saveSocial = trpc.platform.setSocialLinks.useMutation({
    onSuccess: () => social.refetch(),
  });
  return (
    <div className="flow-card staff-form">
      <div className="flow-card-title">
        <div>
          <span className="section-kicker">NOURIX / CONTACT CHANNEL</span>
          <h2>
            {lang === "ar"
              ? "قنوات التواصل"
              : lang === "fr"
                ? "Canaux de contact"
                : "Contact channels"}
          </h2>
        </div>
        <Users size={18} />
      </div>
      <p className="quiet-label">
        {lang === "ar"
          ? "احفظ رقم WhatsApp الرسمي وروابط انستغرام وفيسبوك لتظهر كقنوات تواصل مع الأولياء والطلاب. لا يتم استخدام قيم افتراضية."
          : lang === "fr"
            ? "Enregistrez le numéro WhatsApp officiel et les liens Instagram/Facebook pour les afficher comme canaux de contact. Aucune valeur par défaut n’est utilisée."
            : "Save the official WhatsApp number and Instagram/Facebook links to show as contact channels. No placeholder values are used."}
      </p>
      <div className="invite-box">
        <Input
          type="tel"
          placeholder="+213 5xx xx xx xx"
          aria-label="+213 5xx xx xx xx"
          value={number}
          onChange={e => setNumber(e.target.value)}
        />
        <Button
          className="gold-button"
          disabled={number.replace(/[^0-9]/g, "").length < 8 || save.isPending}
          onClick={() => save.mutate({ number })}
        >
          {lang === "ar"
            ? "حفظ الرقم"
            : lang === "fr"
              ? "Enregistrer"
              : "Save number"}
          <Check size={15} />
        </Button>
      </div>
      {current.data && (
        <small className="form-success">
          {lang === "ar"
            ? `الرقم المحفوظ: +${current.data}`
            : `Saved number: +${current.data}`}
        </small>
      )}
      <div className="admin-form-grid" style={{ marginTop: 14 }}>
        <Input
          placeholder="https://instagram.com/..."
          aria-label="https://instagram.com/..."
          value={instagram}
          onChange={e => setInstagram(e.target.value)}
        />
        <Input
          placeholder="https://facebook.com/..."
          aria-label="https://facebook.com/..."
          value={facebook}
          onChange={e => setFacebook(e.target.value)}
        />
        <Button
          className="quiet-button"
          disabled={saveSocial.isPending || (!instagram && !facebook)}
          onClick={() =>
            saveSocial.mutate({
              instagram: instagram || undefined,
              facebook: facebook || undefined,
            })
          }
        >
          {lang === "ar"
            ? "حفظ الروابط"
            : lang === "fr"
              ? "Enregistrer les liens"
              : "Save links"}
          <Check size={15} />
        </Button>
      </div>
      {(social.data?.instagram || social.data?.facebook) && (
        <small
          className="form-success"
          style={{ display: "block", marginTop: 8 }}
        >
          {social.data.instagram && <>Instagram: {social.data.instagram} </>}
          {social.data.facebook && <>· Facebook: {social.data.facebook}</>}
        </small>
      )}
    </div>
  );
}
