import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import Ionicons from "@react-native-vector-icons/ionicons/static";
import MaterialDesignIcons from "@react-native-vector-icons/material-design-icons";
import { DEFAULT_BORDER_RADIUS } from "../../../commonStyles";
import { t } from "i18next";
import Lucide from "@react-native-vector-icons/lucide/static";

export function MenuModal({
  visible,
  onClose,
  handleSaveToCSV,
  handleVisibleColumns,
  handleDateRange,
  handleDisplayOptions,
}: {
  visible: boolean;
  onClose: () => void;
  handleSaveToCSV: () => void;
  handleVisibleColumns: () => void;
  handleDateRange: () => void;
  handleDisplayOptions: () => void;
}) {
  const theme = useTheme();

  return (
    visible && (
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={[
            styles.menuContainer,
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.card,
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.menuItem, { borderColor: theme.colors.border }]}
            onPress={handleDateRange}
          >
            <MaterialDesignIcons
              name="calendar-expand-horizontal"
              style={[styles.menuIcon, { color: theme.colors.text }]}
            />
            <Text style={[styles.menuText, { color: theme.colors.text }]}>
              {t("Date Range")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuItem, { borderColor: theme.colors.border }]}
            onPress={handleVisibleColumns}
          >
            <Ionicons
              name="eye"
              style={[styles.menuIcon, { color: theme.colors.text }]}
            />
            <Text style={[styles.menuText, { color: theme.colors.text }]}>
              {t("Visible Columns")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuItem, { borderColor: theme.colors.border }]}
            onPress={handleDisplayOptions}
          >
            <Lucide
              name="settings-2"
              style={[styles.menuIcon, { color: theme.colors.text }]}
            />
            <Text style={[styles.menuText, { color: theme.colors.text }]}>
              {t("Display Options")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuItem, { borderColor: theme.colors.border }]}
            onPress={handleSaveToCSV}
          >
            <Lucide
              name="save"
              style={[styles.menuIcon, { color: theme.colors.text }]}
            />
            <Text style={[styles.menuText, { color: theme.colors.text }]}>
              {t("Save to CSV")}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    )
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    backgroundColor: "rgba(0, 0, 0, 0.0)",
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
    width: "100%",
    zIndex: 1,
  },
  menuContainer: {
    position: "absolute",
    top: 0,
    right: 0,
    alignItems: "center",
    borderWidth: 1,
    borderRadius: DEFAULT_BORDER_RADIUS,
  },
  menuItem: {
    alignContent: "flex-start",
    alignItems: "center",
    padding: 18,
    flexDirection: "row",
    width: "100%",
  },
  menuIcon: {
    fontSize: 24,
  },
  menuText: {
    alignItems: "center",
    fontSize: 17,
    fontWeight: "400",
    paddingLeft: 12,
  },
});
