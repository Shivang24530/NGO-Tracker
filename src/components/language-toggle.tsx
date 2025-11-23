"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";

export function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <Button
      variant="outline"
      onClick={toggleLanguage}
      className="text-sm"
    >
      {language === "en" ? "हिंदी" : "English"}
    </Button>
  );
}
