import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

import { buildPDFContent } from "./pdfUtils";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 11,
    fontFamily: "Helvetica",
    lineHeight: 1.5,
  },
  user: {
    marginBottom: 10,
    color: "#1A150F",
  },
  assistant: {
    marginBottom: 14,
    color: "#333333",
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

export default function PdfDocument({ messages }: any) {
  const content = buildPDFContent(messages);

  return (
    <Document>
      <Page style={styles.page}>
        {content.map((msg: any, i: number) => (
          <View key={i} style={msg.role === "user" ? styles.user : styles.assistant}>
            {msg.blocks.map((b: any, j: number) => {
              switch (b.type) {
                case "h2":
                  return <Text key={j} style={styles.h2}>{b.content}</Text>;
                case "h3":
                  return <Text key={j} style={styles.h3}>{b.content}</Text>;
                case "bullet":
                  return <Text key={j} style={styles.bullet}>• {b.content}</Text>;
                case "space":
                  return <View key={j} style={styles.space} />;
                default:
                  return <Text key={j} style={styles.p}>{b.content}</Text>;
              }
            })}
          </View>
        ))}
      </Page>
    </Document>
  );
}