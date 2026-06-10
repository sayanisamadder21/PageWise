import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// Register Noto Sans for Latin + Devanagari (Hindi)
Font.register({
  family: "NotoSans",
  src: "https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts/hinted/ttf/NotoSans/NotoSans-Regular.ttf",
});

// Register Noto Sans Bengali
Font.register({
  family: "NotoSansBengali",
  src: "https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts/hinted/ttf/NotoSansBengali/NotoSansBengali-Regular.ttf",
});

const styles = StyleSheet.create({
  page: {
    padding: 32,
    backgroundColor: "#FFFDF8",
    fontFamily: "NotoSans",
  },
  header: {
    fontSize: 16,
    fontFamily: "NotoSans",
    color: "#1A1A1A",
    marginBottom: 16,
    fontWeight: "bold",
  },
  userLabel: {
    fontSize: 10,
    color: "#FF8A00",
    fontWeight: "bold",
    marginBottom: 4,
    fontFamily: "NotoSans",
  },
  assistantLabel: {
    fontSize: 10,
    color: "#666",
    fontWeight: "bold",
    marginBottom: 4,
    fontFamily: "NotoSans",
  },
  userBubble: {
    backgroundColor: "#2A1E10",
    borderRadius: 8,
    padding: "8 12",
    marginBottom: 12,
  },
  assistantBubble: {
    backgroundColor: "#F5F0E8",
    borderRadius: 8,
    padding: "8 12",
    marginBottom: 12,
    borderLeft: "3px solid #FF8A00",
  },
  messageText: {
    fontSize: 11,
    lineHeight: 1.7,
    color: "#1A1A1A",
    fontFamily: "NotoSans",
  },
  userMessageText: {
    fontSize: 11,
    lineHeight: 1.7,
    color: "#F5F0E8",
    fontFamily: "NotoSans",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 32,
    right: 32,
    borderTop: "1px solid #FF8A00",
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerLeft: {
    fontSize: 8,
    color: "#FF8A00",
    fontWeight: "bold",
    fontFamily: "NotoSans",
  },
  footerCenter: {
    fontSize: 8,
    color: "#999",
    fontFamily: "NotoSans",
  },
  footerRight: {
    fontSize: 8,
    color: "#999",
    fontFamily: "NotoSans",
  },
});

type Message = {
  role: "user" | "assistant";
  content: string;
};

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .replace(/`{1,3}(.*?)`{1,3}/gs, "$1")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/---+/g, "")
    .trim();
}

export function PageWisePdfDocument({ messages }: { messages: Message[] }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <Text style={styles.header}>PageWise Export</Text>

        {/* Messages */}
        {messages.map((msg, i) => (
          <View key={i}>
            {msg.role === "user" ? (
              <>
                <Text style={styles.userLabel}>You</Text>
                <View style={styles.userBubble}>
                  <Text style={styles.userMessageText}>
                    {stripMarkdown(msg.content)}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.assistantLabel}>PageWise AI</Text>
                <View style={styles.assistantBubble}>
                  <Text style={styles.messageText}>
                    {stripMarkdown(msg.content)}
                  </Text>
                </View>
              </>
            )}
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerLeft}>Powered by PageWise</Text>
          <Text style={styles.footerCenter}>getpagewise.vercel.app</Text>
          <Text style={styles.footerRight}>AI-Powered PDF Chat</Text>
        </View>
      </Page>
    </Document>
  );
}