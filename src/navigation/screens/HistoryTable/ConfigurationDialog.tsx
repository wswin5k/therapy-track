import React from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  BackHandler,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import {
  DEFAULT_BORDER_RADIUS,
  SECONDARY_PRESSABLE_HEIGHT,
} from "../../../commonStyles";
import { Portal } from "@gorhom/portal";
import { floatToHexColor } from "../../utils";
import { applyNavigationBarTheme } from "../../../App";

const TRANSPARENCY_ALPHA = 0.7;
const TRANSPARENCY_ALPHA_HEX = floatToHexColor(TRANSPARENCY_ALPHA);

interface AssessmentInputDialogProps {
  children: React.ReactNode;
  title: string;
  onApply: () => void;
  onCancel: () => void;
}

export function ConfigurationDialog({
  children,
  title,
  onApply,
  onCancel,
}: AssessmentInputDialogProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const colorScheme = useColorScheme();

  React.useEffect(() => {
    applyNavigationBarTheme(theme.colors.card, "dark", true);
    return () => {
      applyNavigationBarTheme(theme.colors.card, colorScheme, false);
    };
  }, [theme.colors.card, colorScheme]);

  React.useEffect(() => {
    const backAction = () => {
      onCancel();
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );

    return () => backHandler.remove();
  }, [onCancel]);

  const handleSave = () => {
    onApply();
  };

  return (
    <Portal>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onCancel}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={styles.modal}
        >
          <View
            style={[
              styles.dialog,
              {
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
              <Text
                style={[
                  styles.closeButtonText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                ✕
              </Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              {title}
            </Text>

            <ScrollView persistentScrollbar={true} style={styles.dialogContent}>
              {children}
            </ScrollView>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.colors.primary }]}
              onPress={handleSave}
            >
              <Text
                style={[
                  styles.buttonText,
                  { color: theme.colors.textOnPrimary },
                ]}
              >
                {t("Apply")}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Portal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    flex: 1,
    backgroundColor: "#000000" + TRANSPARENCY_ALPHA_HEX,
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
    width: "100%",
  },
  modal: {
    width: 400,
    maxWidth: "85%",
    maxHeight: "85%",
  },
  dialog: {
    borderRadius: DEFAULT_BORDER_RADIUS,
    maxHeight: "100%",
    width: "100%",
    alignItems: "center",
    borderWidth: 2,
  },
  dialogContent: {
    width: "100%",
    alignSelf: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 20,
    textAlign: "center",
    textAlignVertical: "center",
    width: "100%",
  },
  button: {
    minWidth: "35%",
    borderRadius: DEFAULT_BORDER_RADIUS,
    paddingHorizontal: 16,
    marginVertical: 20,
    justifyContent: "center",
    alignItems: "center",
    height: SECONDARY_PRESSABLE_HEIGHT,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: "500",
    width: "100%",
    textAlign: "center",
  },
  closeButton: {
    position: "absolute",
    top: 0,
    right: 0,
    zIndex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginTop: 6,
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: "300",
  },
});
