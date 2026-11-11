import React from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { ValueType, ValueDomain } from "../models/AssessmentSchedule";
import { useTranslation } from "react-i18next";
import { AssessmentValue } from "../models/Records";
import {
  AssessmentInput,
  getDefaultValue,
  isTextValueValid,
} from "./AssessmentInput";
import { ButtonConfiguration, Dialog } from "./Dialog";

interface AssessmentInputDialogProps {
  title: string;
  assessmentType: ValueType;
  initialValue: AssessmentValue | null;
  valueDomain: ValueDomain;
  onSave: (value: AssessmentValue) => void;
  onCancel: () => void;
  onClear: () => void;
}

export function AssessmentInputDialog({
  title,
  assessmentType,
  initialValue,
  valueDomain,
  onSave,
  onCancel,
  onClear,
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

  const buttons = [
    new ButtonConfiguration(
      t("Save"),
      handleSave,
      theme.colors.primary,
      theme.colors.textOnPrimary,
    ),
  ];

  if (initialValue !== null) {
    buttons.unshift(
      new ButtonConfiguration(
        t("Clear"),
        onClear,
        theme.colors.surface,
        theme.colors.primary,
        theme.colors.primary,
      ),
    );
  }

  return (
    <Dialog
      title={title}
      buttons={buttons}
      onCancel={onCancel}
      showCloseButton={true}
      enableContentScroll={false}
    >
      <View style={styles.contentContainer}>
        <AssessmentInput
          value={value}
          type={assessmentType}
          handleValueChange={setValue}
          valueDomain={valueDomain}
          valueError={valueError}
        />
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  marginContainer: {
    height: 0,
  },
  contentContainer: {
    width: "90%",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
});
