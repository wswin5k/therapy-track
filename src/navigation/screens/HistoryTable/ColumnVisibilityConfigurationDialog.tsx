import React from "react";
import {
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { DEFAULT_BORDER_RADIUS } from "../../../commonStyles";
import { ButtonConfiguration, Dialog } from "../../../components/Dialog";
import Lucide from "@react-native-vector-icons/lucide/static";
import MaterialDesignIcons from "@react-native-vector-icons/material-design-icons";

interface ColumnVisibilityConfigurationDialogProps {
  columnsAll: string[];
  initialVisibleColumns: Set<string>;
  onApply: (visibleColumns: Set<string>) => void;
  onCancel: () => void;
}

export function ColumnVisibilityConfigurationDialog({
  columnsAll: allColumns,
  initialVisibleColumns,
  onApply,
  onCancel,
}: ColumnVisibilityConfigurationDialogProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [visibleColumns, setVisibleColumns] = React.useState<Set<string>>(
    initialVisibleColumns,
  );

  const handleToggleVisibility = (column: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(column)) {
        next.delete(column);
      } else {
        next.add(column);
      }
      return next;
    });
  };

  const handleApply = () => {
    onApply(visibleColumns);
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
    <Dialog
      title="Visible Columns"
      buttons={buttons}
      onCancel={onCancel}
      enableContentScroll={false}
    >
      <View style={styles.contentContainer}>
        <ScrollView
          nestedScrollEnabled={true}
          persistentScrollbar={true}
          style={[
            styles.entriesList,
            {
              borderColor: theme.colors.border,
            },
          ]}
        >
          {allColumns.map((v, idx) => {
            const isSelected = visibleColumns.has(v);
            return (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.entryRow,
                  {
                    borderColor: theme.colors.border,
                  },
                  isSelected
                    ? {
                        backgroundColor: theme.colors.primary + "50",
                      }
                    : {
                        backgroundColor: theme.colors.surface,
                      },
                ]}
                onPress={() => {
                  handleToggleVisibility(v);
                }}
              >
                <Text
                  style={[
                    styles.entryText,
                    {
                      color: theme.colors.text,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {v}
                </Text>
                {isSelected ? (
                  <MaterialDesignIcons
                    style={[
                      styles.entryIcon,
                      { color: theme.colors.textSecondary },
                    ]}
                    name={"eye-outline"}
                  />
                ) : (
                  <Lucide
                    style={[
                      styles.entryIcon,
                      { color: theme.colors.textTertiary },
                    ]}
                    name={"eye-closed"}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    width: "100%",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  entriesList: {
    width: "90%",
    alignSelf: "center",
  },
  entryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 45,
    paddingLeft: 16,
    paddingRight: 10,
    width: "94%",
    alignSelf: "center",
    borderWidth: 1,
    borderRadius: DEFAULT_BORDER_RADIUS,
    marginBottom: 5,
    marginHorizontal: 8,
  },
  entryText: {
    fontSize: 16,
    flexShrink: 1,
  },
  entryIcon: {
    fontSize: 22,
    marginLeft: 8,
  },
});
