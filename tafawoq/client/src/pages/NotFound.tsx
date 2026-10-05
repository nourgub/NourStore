import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

type Lang = "ar" | "fr" | "en";
const labels = {
  ar: {
    title: "الصفحة غير موجودة",
    body: "عذرًا، الصفحة التي تبحث عنها غير موجودة. ربما تم نقلها أو حذفها.",
    goHome: "العودة للرئيسية",
  },
  fr: {
    title: "Page introuvable",
    body: "Désolé, la page que vous recherchez n'existe pas. Elle a peut-être été déplacée ou supprimée.",
    goHome: "Retour à l'accueil",
  },
  en: {
    title: "Page Not Found",
    body: "Sorry, the page you are looking for doesn't exist. It may have been moved or deleted.",
    goHome: "Go Home",
  },
};

export default function NotFound() {
  const [, setLocation] = useLocation();
  const [lang] = useState<Lang>(
    () => (localStorage.getItem("nourix-language") as Lang) || "ar"
  );
  const t = labels[lang];

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div
      dir={lang === "ar" ? "rtl" : "ltr"}
      className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100"
    >
      <Card className="w-full max-w-lg mx-4 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-red-100 rounded-full animate-pulse" />
              <AlertCircle className="relative h-16 w-16 text-red-500" />
            </div>
          </div>

          <h1 className="text-4xl font-bold text-slate-900 mb-2">404</h1>

          <h2 className="text-xl font-semibold text-slate-700 mb-4">
            {t.title}
          </h2>

          <p className="text-slate-600 mb-8 leading-relaxed">{t.body}</p>

          <div
            id="not-found-button-group"
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button
              onClick={handleGoHome}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Home className="w-4 h-4 me-2" />
              {t.goHome}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
