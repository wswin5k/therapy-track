import React from "react";
import {
  StyleSheet,
  Modal,
  View,
  Text,
  TouchableOpacity,
  Switch,
  TextInput,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import { AssessmentType } from "../models/AssessmentSchedule";
import { useTranslation } from "react-i18next";
import SmallNumberStepper from "./SmallNumberStepper";
import { AssessmentValue } from "../models/Records";
import { ERROR_BORDER_WIDTH } from "../navigation/commonConsts";

function AssessmentInput({
  value,
  type,
  handleValueChange,
  valueError,
}: {
  value: AssessmentValue | null;
  type: AssessmentType;
  handleValueChange: (value: AssessmentValue) => void;
  valueError: boolean;
}) {
  const theme = useTheme();

  const renderNumericInput = () => {
    return (
      <SmallNumberStepper
        defaultValue={value ? (value as number) : undefined}
        onChange={handleValueChange}
      />
    );
  };

  const renderBooleanInput = () => {
    return (
      <Switch
        value={value === true}
        onValueChange={handleValueChange}
        trackColor={{
          false: theme.colors.border,
          true: theme.colors.primary,
        }}
        thumbColor={theme.colors.surface}
      />
    );
  };

  const renderTextInput = () => {
    return (
      <TextInput
        value={value as string}
        onChangeText={handleValueChange}
        style={[
          styles.textInput,
          {
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
          },
          valueError && {
            borderColor: theme.colors.error,
            borderWidth: ERROR_BORDER_WIDTH,
          },
        ]}
      />
    );
  };

  let renderInput = () => (
    <View>
      <Text>Wrong assessment type</Text>
    </View>
  );

  switch (type) {
    case AssessmentType.Numeric:
      renderInput = renderNumericInput;
      break;
    case AssessmentType.Boolean:
      renderInput = renderBooleanInput;
      break;
    case AssessmentType.Text:
      renderInput = renderTextInput;
      break;
  }
  return renderInput();
}

interface AssessmentInputDialogProps {
  visible: boolean;
  title: string;
  initialValue: AssessmentValue | null;
  assessmentType: AssessmentType;
  onSave: (value: AssessmentValue) => void;
  onCancel: () => void;
}

export function AssessmentInputDialog({
  visible,
  title,
  initialValue,
  assessmentType,
  onSave,
  onCancel,
}: AssessmentInputDialogProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [value, setValue] = React.useState<AssessmentValue | null>(
    initialValue,
  );
  const [valueError, setValueError] = React.useState<boolean>(false);

  const handleSave = () => {
    if (value !== null) {
      onSave(value);
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
            <Text
              style={[styles.message, { color: theme.colors.textSecondary }]}
            >
              <View style={styles.valueInputContainer}>
                <AssessmentInput
                  value={value}
                  type={assessmentType}
                  handleValueChange={setValue}
                  valueError={valueError}
                />
              </View>
            </Text>
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
  },
  textInput: {
    borderWidth: 1,
    fontSize: 16,
    height: 52,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  valueInputContainer: {
    height: 52,
  },
});
