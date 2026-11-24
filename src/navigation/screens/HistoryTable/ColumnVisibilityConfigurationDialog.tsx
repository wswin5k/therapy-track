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
import MaterialDesignIcons from "@react-native-vector-icons/material-design-icons";
import { removeActiveIngredientSuffix } from "../../../models/MedicineSchedule";

interface ColumnVisibilityConfigurationDialogProps {
  headersAll: string[];
  initialVisibleHeaders: Set<string>;
  onApply: (visibleColumns: Set<string>) => void;
  onCancel: () => void;
}

export function ColumnVisibilityConfigurationDialog({
  headersAll,
  initialVisibleHeaders,
  onApply,
  onCancel,
}: ColumnVisibilityConfigurationDialogProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [visibleHeaders, setVisibleHeaders] = React.useState<Set<string>>(
    initialVisibleHeaders,
  );

  const shortHeadersCount = React.useMemo(() => {
    const counts = new Map();
    [...headersAll].forEach((header) => {
      const shortHeader = removeActiveIngredientSuffix(header);
      const count = counts.get(shortHeader) ?? 0;
      counts.set(shortHeader, count + 1);
    });
    return counts;
  }, [headersAll]);

  const handleToggleVisibility = (column: string) => {
    setVisibleHeaders((prev) => {
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
    onApply(visibleHeaders);
  };

  const formatHeader = (header: string) => {
    const shortHeader = removeActiveIngredientSuffix(header);
    return shortHeadersCount.get(shortHeader) > 1 ? header : shortHeader;
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
          {headersAll.map((header, idx) => {
            const isSelected = visibleHeaders.has(header);
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
                  handleToggleVisibility(header);
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
                  {formatHeader(header)}
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
                  <MaterialDesignIcons
                    style={[
                      styles.entryIcon,
                      { color: theme.colors.textTertiary },
                    ]}
                    name={"eye-off-outline"}
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
