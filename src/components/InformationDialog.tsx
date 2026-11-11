import { StyleSheet, View, Text } from "react-native";
import { useTheme } from "@react-navigation/native";
import { ButtonConfiguration, Dialog } from "./Dialog";

interface InformationDialogProps {
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
  closeText,
  onClose,
}: InformationDialogProps) {
  const theme = useTheme();

  const buttons = [
    new ButtonConfiguration(
      closeText,
      onClose,
      theme.colors.card,
      theme.colors.text,
      theme.colors.border,
    ),
  ];

  return visible ? (
    <Dialog
      title={title}
      buttons={buttons}
      onCancel={onClose}
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
