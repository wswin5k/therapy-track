import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { DEFAULT_BORDER_RADIUS } from "../../../commonStyles";
import { t } from "i18next";
import Lucide from "@react-native-vector-icons/lucide/static";
import MaterialDesignIcons from "@react-native-vector-icons/material-design-icons";

export function ColumnMenuModal({
  onClose,
  handleHidePress,
  handleMoveLeftPress,
  handleMoveRightPress,
  topPosition,
  leftPosition,
}: {
  onClose: () => void;
  handleHidePress: () => void;
  handleMoveLeftPress: () => void;
  handleMoveRightPress: () => void;
  topPosition: number;
  leftPosition: number;
}) {
  const theme = useTheme();

  return (
    <TouchableOpacity
      style={styles.overlay}
      activeOpacity={1}
      onPressIn={onClose}
    >
      <View
        style={[
          styles.menuContainer,
          {
            top: topPosition,
            left: leftPosition,
          },
          {
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.card,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.menuItem, { borderColor: theme.colors.border }]}
          onPress={handleHidePress}
        >
          <MaterialDesignIcons
            name="eye-off-outline"
            style={[styles.menuIcon, { color: theme.colors.text }]}
          />
          <Text style={[styles.menuText, { color: theme.colors.text }]}>
            {t("Hide")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.menuItem, { borderColor: theme.colors.border }]}
          onPress={handleMoveLeftPress}
        >
          <Lucide
            name="arrow-left"
            style={[styles.menuIcon, { color: theme.colors.text }]}
          />
          <Text style={[styles.menuText, { color: theme.colors.text }]}>
            {t("Move left")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.menuItem, { borderColor: theme.colors.border }]}
          onPress={handleMoveRightPress}
        >
          <Lucide
            name="arrow-right"
            style={[styles.menuIcon, { color: theme.colors.text }]}
          />
          <Text style={[styles.menuText, { color: theme.colors.text }]}>
            {t("Move right")}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
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
    alignItems: "center",
    borderWidth: 1,
    borderRadius: DEFAULT_BORDER_RADIUS,
  },
  menuItem: {
    alignContent: "flex-start",
    alignItems: "center",
    padding: 12,
    flexDirection: "row",
    width: "100%",
  },
  menuIcon: {
    fontSize: 20,
  },
  menuText: {
    alignItems: "center",
    fontSize: 16,
    fontWeight: "400",
    paddingLeft: 10,
  },
});
