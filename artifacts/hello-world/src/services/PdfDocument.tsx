import React from "react";
import { Font } from "@react-pdf/renderer";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

import { buildPDFContent } from "./pdfUtils";

const BASE_URL = typeof window !== "undefined" ? window.location.origin : "";


// ─────────────────────────────────────────────
// 1. FONT REGISTRATION (CRITICAL FIX)
// ─────────────────────────────────────────────

Font.register({
  family: "NotoSans",
  src: `${BASE_URL}/fonts/NotoSans-Regular.ttf`,
});

Font.register({
  family: "NotoSansArabic",
  src: `${BASE_URL}/fonts/NotoSansArabic-Regular.ttf`,
});

Font.register({
  family: "NotoSansBengali",
  src: `${BASE_URL}/fonts/NotoSansBengali-Regular.ttf`,
});

Font.register({
  family: "NotoSansDevanagari",
  src: `${BASE_URL}/fonts/NotoSansDevanagari-Regular.ttf`,
});

Font.register({
  family: "NotoSansChinese",
  src: `${BASE_URL}/fonts/NotoSansSC-Regular.ttf`,
});

Font.register({
  family: "NotoSansJapanese",
  src: `${BASE_URL}/fonts/NotoSansJP-Regular.ttf`,
});

Font.register({
  family: "NotoSansKorean",
  src: `${BASE_URL}/fonts/NotoSansKR-Regular.ttf`,
});

Font.register({
  family: "NotoSansTelugu",
  src: `${BASE_URL}/fonts/NotoSansTelugu-Regular.ttf`,
});

Font.register({
  family: "NotoSansTamil",
  src: `${BASE_URL}/fonts/NotoSansTamil-Regular.ttf`,
});


// ─────────────────────────────────────────────
// 2. SCRIPT DETECTION HELPERS
// ─────────────────────────────────────────────

const detectScript = (text: string) => {
  if (/[\u0600-\u06FF]/.test(text)) return "ar";
  if (/[\u0980-\u09FF]/.test(text)) return "bn";
  if (/[\u0900-\u097F]/.test(text)) return "hi";
  if (/[\u4E00-\u9FFF]/.test(text)) return "zh";
  if (/[\u3000-\u30FF]/.test(text)) return "ja";
  if (/[\uAC00-\uD7AF]/.test(text)) return "ko";
  if (/[\u0C00-\u0C7F]/.test(text)) return "te";
  if (/[\u0B80-\u0BFF]/.test(text)) return "ta";
  return "en";
};

const isRTL = (text: string) =>
  /[\u0600-\u06FF]/.test(text);

const getFontFamily = (text: string) => {
  switch (detectScript(text)) {
    case "ar":
      return "NotoSansArabic";
    case "bn":
      return "NotoSansBengali";
    case "hi":
      return "NotoSansDevanagari";
    case "zh":
      return "NotoSansChinese";
    case "ja":
      return "NotoSansJapanese";
    case "ko":
      return "NotoSansKorean";
    case "te":
      return "NotoSansTelugu";
    case "ta":
      return "NotoSansTamil";
    default:
      return "NotoSans";
  }
};


// ─────────────────────────────────────────────
// 3. STYLES (BASE ONLY — dynamic handled in render)
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 11,
    fontFamily: "NotoSans",
    lineHeight: 1.5,
    color: "#1A150F",
  },

  user: {
    marginBottom: 10,
  },

  assistant: {
    marginBottom: 14,
  },

  h2: {
    fontSize: 16,
    marginTop: 10,
    marginBottom: 6,
    fontWeight: 700,
  },

  h3: {
    fontSize: 13,
    marginTop: 8,
    marginBottom: 4,
    fontWeight: 600,
  },

  bullet: {
    marginLeft: 10,
    marginBottom: 2,
  },

  p: {
    marginBottom: 4,
  },

  space: {
    height: 6,
  },
});
// ─────────────────────────────────────────────
// 4. MAIN COMPONENT
// ─────────────────────────────────────────────

export default function PdfDocument({ messages }: any) {
  const content = buildPDFContent(messages);

  return (
    <Document>
      <Page style={styles.page}>

        {content.map((msg: any, i: number) => {
          const rtl = isRTL(msg.text || "");

          return (
            <View
              key={i}
              style={msg.role === "user" ? styles.user : styles.assistant}
            >

              {msg.blocks.map((b: any, j: number) => {
                const text = b.content || "";
                const font = getFontFamily(text);
                const dirRTL = isRTL(text);

                const baseTextStyle = {
                  fontFamily: font,
                  textAlign: (dirRTL ? "right" : "left") as "right" | "left",
                };

                switch (b.type) {
                  case "h2":
                    return (
                      <Text key={j} style={[styles.h2, baseTextStyle]}>
                        {text}
                      </Text>
                    );

                  case "h3":
                    return (
                      <Text key={j} style={[styles.h3, baseTextStyle]}>
                        {text}
                      </Text>
                    );

                  case "bullet":
                    return (
                      <Text key={j} style={[styles.bullet, baseTextStyle]}>
                        • {text}
                      </Text>
                    );

                  case "space":
                    return <View key={j} style={styles.space} />;

                  default:
                    return (
                      <Text key={j} style={[styles.p, baseTextStyle]}>
                        {text}
                      </Text>
                    );
                }
              })}
            </View>
          );
        })}

      </Page>
    </Document>
  );
}