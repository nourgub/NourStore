import { describe, expect, it } from "vitest";
import { foreignLanguageOfLesson, foreignLanguageOfSubject, spokenChunks, spokenParts, spokenSegments, withoutName } from "./spokenArabic";

describe("spoken sentences", () => {
  it("cuts the teacher's text into short sentences every student shares", () => {
    const chunks = spokenChunks("السلام عليكم يا سارة! معك أستاذ الرياضيات. أتمنى أن تكون بخير.\nمثال: f(x) = 3x²");
    expect(chunks).toEqual(["السلام عليكم يا سارة!", "معك أستاذ الرياضيات.", "أتمنى أن تكون بخير.", "مثال:", "إف إكس يساوي 3 إكس تربيع"]);
  });

  it("keeps decimals whole and long sentences under the cap", () => {
    expect(spokenChunks("النتيجة 2.5 تقريباً.")).toEqual(["النتيجة 2.5 تقريباً."]);
    const long = Array.from({ length: 40 }, (_, index) => `جملة ${index}،`).join(" ");
    for (const chunk of spokenChunks(long, 60)) expect(chunk.length).toBeLessThanOrEqual(60);
  });

  it("tells the maths (what changes) from the prose (what repeats)", () => {
    expect(spokenSegments("إذن الجواب: 6 إكس ناقص 5.")).toEqual([
      { math: false, text: "إذن الجواب:" },
      { math: true, text: "6 إكس ناقص 5." },
    ]);
    expect(spokenSegments("حالة عدم تعيين من الشكل ما لا نهاية على ما لا نهاية")).toEqual([
      { math: false, text: "حالة عدم تعيين من الشكل" },
      { math: true, text: "ما لا نهاية على ما لا نهاية" },
    ]);
    // Weak words ("على", "من") are maths only between two maths words.
    expect(spokenSegments("نعمل على النهايات من جديد")).toEqual([{ math: false, text: "نعمل على النهايات من جديد" }]);
    expect(spokenSegments("أتمنى أن تكون بخير.")).toEqual([{ math: false, text: "أتمنى أن تكون بخير." }]);
  });

  it("ends a maths run at punctuation, so the pause falls where it is written", () => {
    expect(spokenSegments("إكس يساوي 2، واي يساوي 3").map(segment => segment.text)).toEqual(["إكس يساوي 2،", "واي يساوي 3"]);
  });

  it("says a sentence without the student's name, the way every student shares it", () => {
    expect(withoutName("السلام عليكم يا سارة!", "سارة")).toBe("السلام عليكم!");
    expect(withoutName("صحيح، أحسنت يا سارة!", "سارة")).toBe("صحيح، أحسنت!");
    expect(withoutName("رائع يا سارة، لقد وصلت إلى القاعدة بنفسك:", "سارة")).toBe("رائع، لقد وصلت إلى القاعدة بنفسك:");
    expect(withoutName("مرحباً سارة.", "سارة")).toBe("مرحباً.");
    expect(withoutName("أتمنى أن تكون بخير.", "سارة")).toBe("أتمنى أن تكون بخير.");
  });
});

describe("spokenParts (language lessons)", () => {
  it("cuts the taught language out of the Arabic, notation read as words", () => {
    expect(spokenParts("Perfekt = haben أو sein + Partizip II في الآخر.", "de")).toEqual([
      { text: "Perfekt", lang: "de" },
      { text: "يعني", lang: "ar" },
      { text: "haben", lang: "de" },
      { text: "أو", lang: "ar" },
      { text: "sein", lang: "de" },
      { text: "مع", lang: "ar" },
      { text: "Partizip II", lang: "de" },
      { text: "في الآخر.", lang: "ar" },
    ]);
  });

  it("keeps a German sentence whole, a blank as a pause, word-part hyphens silent", () => {
    expect(spokenParts("أكمل: «Ich ___ gestern Fußball gespielt.»", "de")).toEqual([
      { text: "أكمل:", lang: "ar" },
      { text: "Ich … gestern Fußball gespielt.", lang: "de" },
    ]);
    expect(spokenParts("تنتهي بـ -en", "de")).toEqual([
      { text: "تنتهي بـ", lang: "ar" },
      { text: "en", lang: "de" },
    ]);
  });

  it("says a German dialogue's markers in German, the Arabic one's in Arabic", () => {
    expect(spokenParts("Kein Problem.\n💡 Nur r wird zu n.\n\n❓ (1/4) «Ich sehe ___ Hund». Was wird aus der?", "de")).toEqual([
      { text: "Kein Problem. Tipp: Nur r wird zu n. Frage 1: Ich sehe … Hund. Was wird aus der?", lang: "de" },
    ]);
    expect(spokenParts("❓ (2/4) ما Partizip II للفعل kaufen؟", "de")[0]).toEqual({ text: "السؤال 2:", lang: "ar" });
  });

  it("reads Spanish and Italian with their own markers and letters", () => {
    expect(spokenParts("Casi.\n💡 Piensa en haber.\n\n❓ (2/4) ¿Cuál es el participio de «hacer»?", "es")).toEqual([
      { text: "Casi. Pista: Piensa en haber. Pregunta 2: ¿Cuál es el participio de hacer?", lang: "es" },
    ]);
    expect(spokenParts("❓ (3/4) «Sono andato» o «ho andato»? Perché?", "it")).toEqual([
      { text: "Domanda 3: Sono andato o ho andato? Perché?", lang: "it" },
    ]);
    expect(foreignLanguageOfLesson("es-tenses")).toBe("es");
    expect(foreignLanguageOfSubject("italian")).toBe("it");
  });

  it("is plain Arabic (maths included) outside language lessons", () => {
    expect(spokenParts("x − 3 = 5")).toEqual([{ text: "إكس ناقص 3 يساوي 5", lang: "ar" }]);
    expect(foreignLanguageOfLesson("de-tenses")).toBe("de");
    expect(foreignLanguageOfLesson("math-limits")).toBeNull();
    expect(foreignLanguageOfSubject("german")).toBe("de");
  });
});
