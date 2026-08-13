import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";

export function DefaultMainContainer({
  children,
  style = {},
  justifyContent = "flex-start",
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  justifyContent?: "center" | "flex-start";
}) {
  const theme = useTheme();

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        style,
        { backgroundColor: theme.colors.background },
      ]}
      edges={["bottom", "left", "right"]}
    >
      <View style={[styles.mainContainer, { justifyContent: justifyContent }]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  mainContainer: {
    flex: 1,
    justifyContent: "flex-start",
  },
});
