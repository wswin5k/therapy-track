import React from "react";
import { StyleSheet, View, Text, Switch } from "react-native";
import { useTheme } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { eStyles } from "../../../commonStyles";
import { ButtonConfiguration, Dialog } from "../../../components/Dialog";

export class DisplayOptions {
  constructor(
    public expandAllRows: boolean,
    public showDaysWithoutEntries: boolean,
  ) {}
}

interface DisplayOptionsConfigurationDialogProps {
  initialDisplayOptions: DisplayOptions;
  onApply: (displayOptions: DisplayOptions) => void;
  onCancel: () => void;
}

export function DisplayOptionsConfigurationDialog({
  initialDisplayOptions,
  onApply,
  onCancel,
}: DisplayOptionsConfigurationDialogProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [displayOptions, setDisplayOptions] = React.useState<DisplayOptions>(
    initialDisplayOptions,
  );

  const handleUpdateDisplayOptions = (updates: Partial<DisplayOptions>) => {
    setDisplayOptions((value) => {
      return { ...value, ...updates };
    });
  };

  const handleApply = () => {
    onApply(displayOptions);
  };

  const buttons = [
    new ButtonConfiguration(
      t("Apply"),
      handleApply,
      theme.colors.primary,
      theme.colors.textOnPrimary,
    ),
  ];

  return (
    <Dialog title="Display Options" buttons={buttons} onCancel={onCancel}>
      <View style={styles.optionsRowContainer}>
        <Text style={[styles.labelText, { color: theme.colors.text }]}>
          {t("Expand all rows")}
        </Text>
        <Switch
          value={displayOptions.expandAllRows}
          onValueChange={(value: boolean) =>
            handleUpdateDisplayOptions({ expandAllRows: value })
          }
          trackColor={{
            false: theme.colors.border,
            true: theme.colors.primary,
          }}
          thumbColor={theme.colors.surface}
          style={eStyles.switchPressable}
        />
      </View>
      <View style={styles.optionsRowContainer}>
        <Text style={[styles.labelText, { color: theme.colors.text }]}>
          {t("Show days without entries")}
        </Text>
        <Switch
          value={displayOptions.showDaysWithoutEntries}
          onValueChange={(value: boolean) =>
            handleUpdateDisplayOptions({
              showDaysWithoutEntries: value,
            })
          }
          trackColor={{
            false: theme.colors.border,
            true: theme.colors.primary,
          }}
          thumbColor={theme.colors.surface}
          style={eStyles.switchPressable}
        />
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  labelText: {
    flexShrink: 1,
    fontSize: 17,
    fontWeight: "400",
    paddingHorizontal: 0,
  },
  optionsRowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
});
