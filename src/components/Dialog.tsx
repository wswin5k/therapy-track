import React from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  BackHandler,
  useWindowDimensions,
} from "react-native";
import { ThemeContext, useTheme } from "@react-navigation/native";
import {
  DEFAULT_BORDER_RADIUS,
  TERTIARY_PRESSABLE_HEIGHT,
} from "../commonStyles";
import { Portal } from "@gorhom/portal";
import { applyNavigationBarTheme, floatToHexColor } from "../navigation/utils";

const TRANSPARENCY_ALPHA = 0.8;
const TRANSPARENCY_ALPHA_HEX = floatToHexColor(TRANSPARENCY_ALPHA);

export class ButtonConfiguration {
  constructor(
    public text: string,
    public onPress: () => void,
    public backgroundColor: string,
    public textColor: string,
    public borderColor?: string,
    public borderWidth?: number,
  ) {}
}

interface DialogProps {
  children: React.ReactNode;
  buttons: ButtonConfiguration[];
  title: string;
  onCancel: () => void;
  showCloseButton?: boolean;
  enableContentScroll?: boolean;
}

export function Dialog({
  children,
  buttons,
  title,
  onCancel,
  showCloseButton = true,
  enableContentScroll = true,
}: DialogProps) {
  const theme = useTheme();
  const colorScheme = useColorScheme();

  const { height: screenHeight } = useWindowDimensions();
  const maxModalHeight = React.useMemo(
    () => Math.min(500, screenHeight * 0.85),
    [screenHeight],
  );

  React.useEffect(() => {
    applyNavigationBarTheme(theme.colors.card, "dark", true);
    return () => {
      applyNavigationBarTheme(theme.colors.card, colorScheme, false);
    };
  }, [theme.colors.card, colorScheme]);

  React.useEffect(() => {
    const backAction = () => {
      onCancel();
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );

    return () => backHandler.remove();
  }, [onCancel]);

  return (
    <Portal>
      <ThemeContext value={theme}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onCancel}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={[styles.modal, { maxHeight: maxModalHeight }]}
          >
            <View
              style={[
                styles.dialog,
                {
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              {showCloseButton && (
                <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
                  <Text
                    style={[
                      styles.closeButtonText,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    ✕
                  </Text>
                </TouchableOpacity>
              )}
              <Text style={[styles.title, { color: theme.colors.text }]}>
                {title}
              </Text>

              {enableContentScroll ? (
                <ScrollView
                  persistentScrollbar={true}
                  style={styles.dialogContent}
                >
                  {children}
                </ScrollView>
              ) : (
                <View style={styles.dialogContent}>{children}</View>
              )}

              <View style={styles.buttonContainer}>
                {buttons.map((bc, idx) => (
                  <TouchableOpacity
                    style={[
                      styles.button,
                      {
                        backgroundColor: bc.backgroundColor,
                        borderColor: bc.borderColor,
                        borderWidth:
                          (bc.borderWidth ?? bc.borderColor)
                            ? DEFAULT_BUTTON_BORDER
                            : undefined,
                      },
                    ]}
                    onPress={bc.onPress}
                    key={idx}
                  >
                    <Text style={[styles.buttonText, { color: bc.textColor }]}>
                      {bc.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </ThemeContext>
    </Portal>
  );
}

const DEFAULT_BUTTON_BORDER = 1.5;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    flex: 1,
    backgroundColor: "#000000" + TRANSPARENCY_ALPHA_HEX,
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
    width: "100%",
  },
  modal: {
    width: 400,
    maxWidth: "85%",
  },
  dialog: {
    borderRadius: DEFAULT_BORDER_RADIUS,
    maxHeight: "100%",
    width: "100%",
    alignItems: "center",
    borderWidth: 2,
  },
  dialogContent: {
    flexShrink: 1,
    width: "100%",
    alignSelf: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 20,
    textAlign: "center",
    textAlignVertical: "center",
    width: "100%",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    width: "100%",
    gap: 26,
  },
  button: {
    minWidth: "35%",
    borderRadius: DEFAULT_BORDER_RADIUS,
    paddingHorizontal: 16,
    marginVertical: 20,
    justifyContent: "center",
    alignItems: "center",
    height: TERTIARY_PRESSABLE_HEIGHT,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: "500",
    width: "100%",
    textAlign: "center",
  },
  closeButton: {
    position: "absolute",
    top: 0,
    right: 0,
    zIndex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginTop: 6,
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: "300",
  },
});
