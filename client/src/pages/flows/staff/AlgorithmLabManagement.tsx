// Algorithm Lab admin: exercise authoring and skills management,
// split out of the former monolithic StaffFlows.tsx.

import { useState } from "react";
import {
  ClipboardCheck,
  Plus,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  type Lang,
  questions,
} from "../shared";

export function AlgorithmExerciseAdminPanel({ lang }: { lang: Lang }) {
  const exercises = trpc.admin.algorithmExercises.useQuery();
  const [slug, setSlug] = useState("");
  const [difficulty, setDifficulty] = useState<
    "starter" | "easy" | "medium" | "hard"
  >("starter");
  const [titleAr, setTitleAr] = useState("");
  const [titleFr, setTitleFr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [statementAr, setStatementAr] = useState("");
  const [statementFr, setStatementFr] = useState("");
  const [statementEn, setStatementEn] = useState("");
  const [starterCode, setStarterCode] = useState("");
  const [testCasesJson, setTestCasesJson] = useState(
    '{"displayCases":[{"input":"2, 3","output":"5"}],"requiredSubstrings":["READ(A)","READ(B)","WRITE(SUM)"],"patternRegex":"SUM(?:←|=)A\\\\+B"}'
  );
  const [hintsJson, setHintsJson] = useState(
    '["Make sure the result variable is declared before use."]'
  );
  const create = trpc.admin.createAlgorithmExercise.useMutation({
    onSuccess: () => {
      exercises.refetch();
      setSlug("");
      setTitleAr("");
      setTitleFr("");
      setTitleEn("");
      setStatementAr("");
      setStatementFr("");
      setStatementEn("");
      setStarterCode("");
    },
  });
  const publish = trpc.admin.publishAlgorithmExercise.useMutation({
    onSuccess: () => exercises.refetch(),
  });
  const canCreate = Boolean(
    slug &&
      titleAr &&
      titleFr &&
      titleEn &&
      statementAr &&
      statementFr &&
      statementEn &&
      starterCode &&
      testCasesJson
  );
  return (
    <div className="flow-card staff-form">
      <div className="flow-card-title">
        <div>
          <span className="section-kicker">NOURIX / ALGORITHM LAB</span>
          <h2>
            {lang === "ar"
              ? "تمارين مختبر الخوارزميات"
              : lang === "fr"
                ? "Exercices du laboratoire"
                : "Algorithm lab exercises"}
          </h2>
        </div>
        <ClipboardCheck size={18} />
      </div>
      <p className="quiet-label">
        {lang === "ar"
          ? "لا يوجد تنفيذ حقيقي للكود؛ حدّد الأنماط المطلوبة (requiredSubstrings) وتعبيرًا اختياريًا (patternRegex) للتحقق."
          : "No real code execution — define required patterns (requiredSubstrings) and an optional regex (patternRegex) for validation."}
      </p>
      <div className="admin-form-grid">
        <Input
          placeholder="exercise-slug"
          aria-label="exercise-slug"
          value={slug}
          onChange={e =>
            setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
          }
        />
        <select
          value={difficulty}
          onChange={e => setDifficulty(e.target.value as typeof difficulty)}
        >
          <option value="starter">Starter</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <Input
          placeholder="العنوان بالعربية"
          aria-label="العنوان بالعربية"
          value={titleAr}
          onChange={e => setTitleAr(e.target.value)}
        />
        <Input
          placeholder="Titre français"
          aria-label="Titre français"
          value={titleFr}
          onChange={e => setTitleFr(e.target.value)}
        />
        <Input
          placeholder="English title"
          aria-label="English title"
          value={titleEn}
          onChange={e => setTitleEn(e.target.value)}
        />
        <Input
          placeholder="نص التمرين بالعربية"
          aria-label="نص التمرين بالعربية"
          value={statementAr}
          onChange={e => setStatementAr(e.target.value)}
        />
        <Input
          placeholder="Énoncé français"
          aria-label="Énoncé français"
          value={statementFr}
          onChange={e => setStatementFr(e.target.value)}
        />
        <Input
          placeholder="English statement"
          aria-label="English statement"
          value={statementEn}
          onChange={e => setStatementEn(e.target.value)}
        />
      </div>
      <textarea
        className="code-editor"
        style={{ minHeight: 100, marginTop: 10 }}
        placeholder="Starter pseudocode"
        aria-label="Starter pseudocode"
        value={starterCode}
        onChange={e => setStarterCode(e.target.value)}
      />
      <textarea
        className="code-editor"
        style={{ minHeight: 70, marginTop: 10 }}
        placeholder='{"displayCases":[...],"requiredSubstrings":[...],"patternRegex":"..."}'
        value={testCasesJson}
        onChange={e => setTestCasesJson(e.target.value)}
      />
      <textarea
        className="code-editor"
        style={{ minHeight: 50, marginTop: 10 }}
        placeholder='["hint 1", "hint 2"]'
        value={hintsJson}
        onChange={e => setHintsJson(e.target.value)}
      />
      <Button
        className="gold-button"
        style={{ marginTop: 10 }}
        disabled={!canCreate || create.isPending}
        onClick={() =>
          create.mutate({
            slug,
            difficulty,
            titleAr,
            titleFr,
            titleEn,
            statementAr,
            statementFr,
            statementEn,
            starterCode,
            testCasesJson,
            hintsJson: hintsJson || undefined,
          })
        }
      >
        {lang === "ar" ? "إنشاء التمرين" : "Create exercise"}
        <Plus size={15} />
      </Button>
      {exercises.data?.length ? (
        <div className="plan-list" style={{ marginTop: 14 }}>
          {exercises.data.map(ex => (
            <div className="staff-row" key={ex.id}>
              <span>{ex.difficulty}</span>
              <p>
                <strong>
                  {lang === "ar"
                    ? ex.titleAr
                    : lang === "fr"
                      ? ex.titleFr
                      : ex.titleEn}
                </strong>
                <small>
                  {ex.isPublished
                    ? lang === "ar"
                      ? "منشور"
                      : "Published"
                    : lang === "ar"
                      ? "مسودة"
                      : "Draft"}
                </small>
              </p>
              <Button
                className="table-action"
                onClick={() =>
                  publish.mutate({ id: ex.id, published: !ex.isPublished })
                }
              >
                {ex.isPublished
                  ? lang === "ar"
                    ? "إخفاء"
                    : "Unpublish"
                  : lang === "ar"
                    ? "نشر"
                    : "Publish"}
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

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
