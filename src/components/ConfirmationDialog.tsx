import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { useTheme } from "@react-navigation/native";
import { ButtonConfiguration, Dialog } from "./Dialog";

interface ConfirmationDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationDialog({
  visible,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  const theme = useTheme();

  const buttons = [
    new ButtonConfiguration(
      cancelText,
      onCancel,
      theme.colors.card,
      theme.colors.text,
      theme.colors.border,
    ),
    new ButtonConfiguration(
      confirmText,
      onConfirm,
      theme.colors.error,
      theme.colors.textOnPrimary,
    ),
  ];

  return visible ? (
    <Dialog
      title={title}
      buttons={buttons}
      onCancel={onCancel}
      showCloseButton={false}
    >
      <View style={styles.messageContainer}>
        <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
          {message}
        </Text>
      </View>
    </Dialog>
  ) : (
    ""
  );
}

const styles = StyleSheet.create({
  messageContainer: {
    marginHorizontal: 24,
  },
  message: {
    fontSize: 17,
    textAlign: "left",
    lineHeight: 21,
    marginBottom: 10,
  },
});
