import { KeyboardAvoidingView, StyleSheet } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";

const DEFAULT_ADDITIONAL_OFFSET = 10;

export function DefaultKeyboardAvoidingView({
  children,
  additionalOffset = DEFAULT_ADDITIONAL_OFFSET,
}: {
  children: React.ReactNode;
  additionalOffset?: number;
}) {
  const headerHeight = useHeaderHeight() + additionalOffset;

  return (
    <KeyboardAvoidingView
      style={styles.mainContainer}
      keyboardVerticalOffset={headerHeight}
      behavior="padding"
    >
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
});
