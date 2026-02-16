import React from "react";
import { StyleSheet, Modal, View, Text, TouchableOpacity } from "react-native";
import { useTheme } from "@react-navigation/native";

interface ConfirmationDialogProps {
  visible: boolean;
  title: string;
  message: string;
  closeText: string;
  onClose: () => void;
}

export function InformationDialog({
  visible,
  title,
  message,
  closeText: closeText,
  onClose: onClose,
}: ConfirmationDialogProps) {
  const theme = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.dialog, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              {title}
            </Text>
            <Text
              style={[styles.message, { color: theme.colors.textSecondary }]}
            >
              {message}
            </Text>
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.closeButton,
                  { borderColor: theme.colors.border },
                ]}
                onPress={onClose}
              >
                <Text style={[styles.buttonText, { color: theme.colors.text }]}>
                  {closeText}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  dialog: {
    maxWidth: "85%",
    width: 400,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 30,
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    fontSize: 15,
    marginBottom: 20,
    textAlign: "left",
    lineHeight: 21,
  },
  buttonContainer: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
    justifyContent: "center",
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButton: {
    borderWidth: 1,
    maxWidth: 100,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "500",
  },
});
