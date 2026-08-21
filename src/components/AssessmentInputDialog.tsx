import React from "react";
import { StyleSheet, Modal, View, Text, TouchableOpacity } from "react-native";
import { useTheme } from "@react-navigation/native";
import { AssessmentType, ValueDomain } from "../models/AssessmentSchedule";
import { useTranslation } from "react-i18next";
import { AssessmentValue } from "../models/Records";
import {
  AssessmentInput,
  getDefaultValue,
  isTextValueValid,
} from "./AssessmentInput";

interface AssessmentInputDialogProps {
  title: string;
  assessmentType: AssessmentType;
  initialValue: AssessmentValue | null;
  valueDomain: ValueDomain;
  onSave: (value: AssessmentValue) => void;
  onCancel: () => void;
}

export function AssessmentInputDialog({
  title,
  assessmentType,
  initialValue,
  valueDomain,
  onSave,
  onCancel,
}: AssessmentInputDialogProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [value, setValue] = React.useState<AssessmentValue | null>(
    initialValue !== null ? initialValue : getDefaultValue(assessmentType),
  );
  const [valueError, setValueError] = React.useState<boolean>(false);

  const handleSave = () => {
    if (value !== null) {
      if (isTextValueValid(value, valueDomain)) {
        setValueError(true);
      } else {
        onSave(value);
      }
    } else {
      setValueError(true);
    }
  };

  return (
    <Modal transparent animationType="fade" onRequestClose={onCancel}>
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
              { backgroundColor: theme.colors.background },
            ]}
          >
            <Text style={[styles.title, { color: theme.colors.text }]}>
              {title}
            </Text>
            <View style={styles.content}>
              <AssessmentInput
                value={value}
                type={assessmentType}
                handleValueChange={setValue}
                valueDomain={valueDomain}
                valueError={valueError}
              />
            </View>
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.cancelButton,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.card,
                  },
                ]}
                onPress={onCancel}
              >
                <Text style={[styles.buttonText, { color: theme.colors.text }]}>
                  {t("Cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={handleSave}
              >
                <Text style={[styles.buttonText, { color: "white" }]}>
                  {t("Save")}
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
    height: "100%",
  },
  modal: {
    width: 400,
    maxWidth: "85%",
    maxHeight: "70%",
    alignSelf: "center",
  },
  dialog: {
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 20,
    maxHeight: "100%",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
    height: 40,
    textAlignVertical: "center",
    width: "100%",
  },
  content: {
    fontSize: 15,
    marginBottom: 15,
    textAlign: "left",
    lineHeight: 21,
    width: "100%",
  },
  buttonContainer: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
    height: 48,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "500",
    width: "100%",
    textAlign: "center",
  },
});
