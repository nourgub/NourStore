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
  const approvalCurrent = trpc.platform.adminApprovalWhatsapp.useQuery();
  const [approvalNumber, setApprovalNumber] = useState("");
  const saveApprovalNumber = trpc.platform.setAdminApprovalWhatsapp.useMutation({
    onSuccess: () => approvalCurrent.refetch(),
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
      <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,.1)" }}>
        <h3 style={{ fontSize: 15, marginBottom: 6 }}>
          {lang === "ar"
            ? "رقم واتساب المسؤول (للموافقة على الحسابات الجديدة)"
            : lang === "fr"
              ? "Numéro WhatsApp de l'administrateur (approbation des comptes)"
              : "Admin's WhatsApp number (account approval)"}
        </h3>
        <p className="quiet-label">
          {lang === "ar"
            ? "رقمك الشخصي على واتساب. عند تسجيل متعلم أو أستاذ جديد ستصلك رسالة، ويمكنك الرد بـ «قبول [المعرف]» أو «رفض [المعرف]» لتفعيل الحساب أو رفضه — إضافة لزر «تفعيل» في لوحة المستخدمين أدناه."
            : lang === "fr"
              ? "Votre numéro WhatsApp personnel. Vous recevrez un message à chaque nouvelle inscription et pourrez répondre par « قبول [id] » ou « رفض [id] » pour approuver ou rejeter le compte — en plus du bouton « Activer » dans la gestion des utilisateurs ci-dessous."
              : "Your personal WhatsApp number. You'll get a message on every new registration and can reply with \"قبول [id]\" or \"رفض [id]\" to approve or reject the account — in addition to the \"Activate\" button in user management below."}
        </p>
        <div className="invite-box">
          <Input
            type="tel"
            placeholder="+213 5xx xx xx xx"
            aria-label="+213 5xx xx xx xx"
            value={approvalNumber}
            onChange={e => setApprovalNumber(e.target.value)}
          />
          <Button
            className="gold-button"
            disabled={
              approvalNumber.replace(/[^0-9]/g, "").length < 8 ||
              saveApprovalNumber.isPending
            }
            onClick={() => saveApprovalNumber.mutate({ number: approvalNumber })}
          >
            {lang === "ar"
              ? "حفظ الرقم"
              : lang === "fr"
                ? "Enregistrer"
                : "Save number"}
            <Check size={15} />
          </Button>
        </div>
        {approvalCurrent.data && (
          <small className="form-success">
            {lang === "ar"
              ? `الرقم المحفوظ: +${approvalCurrent.data}`
              : `Saved number: +${approvalCurrent.data}`}
          </small>
        )}
      </div>
    </div>
  );
}
