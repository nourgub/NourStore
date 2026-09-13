// Skills tagging admin — split out of the former
// AlgorithmLabManagement.tsx once the algorithm-lab exercise authoring
// half of that file was removed (the platform is now math-teacher-training
// only). Skills themselves are generic (tag lessons/questions for
// strengths/weaknesses analytics) and stayed.

import { useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { type Lang } from "../shared";

export function SkillsAdminPanel({ lang }: { lang: Lang }) {
  const skills = trpc.content.skills.useQuery();
  const subjectsForSkills = trpc.learning.subjects.useQuery();
  const [slug, setSlug] = useState("");
  const [subject, setSubject] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [titleFr, setTitleFr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const create = trpc.admin.createSkill.useMutation({
    onSuccess: () => {
      skills.refetch();
      setSlug("");
      setTitleAr("");
      setTitleFr("");
      setTitleEn("");
    },
  });
  return (
    <div className="flow-card staff-form">
      <div className="flow-card-title">
        <div>
          <span className="section-kicker">NOURIX / SKILLS</span>
          <h2>
            {lang === "ar"
              ? "المهارات والأهداف"
              : lang === "fr"
                ? "Compétences et objectifs"
                : "Skills & objectives"}
          </h2>
        </div>
        <Sparkles size={18} />
      </div>
      <p className="quiet-label">
        {lang === "ar"
          ? "أنشئ مهارات هنا ثم اربطها بالدروس والأسئلة لحساب نقاط القوة والضعف تلقائيًا."
          : "Create skills here, then tag lessons and questions with them to compute strengths/weaknesses automatically."}
      </p>
      <div className="admin-form-grid">
        <Input
          placeholder="skill-slug"
          aria-label="skill-slug"
          value={slug}
          onChange={e =>
            setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
          }
        />
        <select value={subject} onChange={e => setSubject(e.target.value)}>
          <option value="" disabled>
            {lang === "ar" ? "اختر المادة" : "Choose subject"}
          </option>
          {(subjectsForSkills.data || []).map(option => (
            <option key={option.slug} value={option.slug}>
              {option.titleAr}
            </option>
          ))}
        </select>
        <Input
          placeholder="اسم المهارة بالعربية"
          aria-label="اسم المهارة بالعربية"
          value={titleAr}
          onChange={e => setTitleAr(e.target.value)}
        />
        <Input
          placeholder="Nom français"
          aria-label="Nom français"
          value={titleFr}
          onChange={e => setTitleFr(e.target.value)}
        />
        <Input
          placeholder="English name"
          aria-label="English name"
          value={titleEn}
          onChange={e => setTitleEn(e.target.value)}
        />
      </div>
      <Button
        className="gold-button"
        disabled={
          !slug ||
          !subject ||
          !titleAr ||
          !titleFr ||
          !titleEn ||
          create.isPending
        }
        onClick={() =>
          create.mutate({ slug, subject, titleAr, titleFr, titleEn })
        }
      >
        {lang === "ar" ? "إنشاء مهارة" : "Create skill"}
        <Plus size={15} />
      </Button>
      {skills.data?.length ? (
        <div
          style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}
        >
          {skills.data.map(skill => (
            <small key={skill.id} className="quiet-label">
              {skill.titleAr} ({skill.subject})
            </small>
          ))}
        </div>
      ) : null}
    </div>
  );
}
