import { useTheme } from "@react-navigation/native";
import React from "react";
import {
  Animated,
  StyleSheet,
  Text,
  useAnimatedValue,
  View,
} from "react-native";
import { DEFAULT_BORDER_RADIUS } from "../commonStyles";
import { mixColors } from "../navigation/utils";

export enum ToastType {
  Default = "Default",
  Success = "Success",
  Error = "Error",
}

type ToastProps = {
  message: string;
  duration?: number;
  visible: boolean;
  onHide: () => void;
  type?: ToastType;
};

export function Toast({
  message,
  duration = 4000,
  visible,
  onHide,
  type = ToastType.Default,
}: ToastProps) {
  const opacity = useAnimatedValue(0);
  const theme = useTheme();

  React.useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let animation: Animated.CompositeAnimation | undefined;

    if (visible) {
      animation = Animated.timing(opacity, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      });

      animation.start(({ finished }) => {
        if (!finished) return;

        timeout = setTimeout(() => {
          animation = Animated.timing(opacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          });

          animation.start(({ finished: fadedOut }) => {
            if (fadedOut) {
              onHide();
            }
          });
        }, duration);
      });
    } else {
      animation = Animated.timing(opacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      });
      animation.start();
    }

    return () => {
      if (timeout) clearTimeout(timeout);
      animation?.stop();
    };
  }, [visible, duration, opacity, onHide]);

  const backgroundColor = React.useMemo(() => {
    if (type === ToastType.Error) {
      return mixColors(theme.colors.backgroundToast, theme.colors.error, 0.7);
    } else if (type === ToastType.Success) {
      return mixColors(theme.colors.backgroundToast, theme.colors.success, 0.8);
    } else {
      return theme.colors.backgroundToast;
    }
  }, [theme.colors, type]);

  return visible ? (
    <View pointerEvents="none" style={[styles.container]}>
      <Animated.View
        style={[
          styles.toast,
          { opacity },
          {
            backgroundColor: backgroundColor,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Text style={[styles.message, { color: theme.colors.textOnPrimary }]}>
          {message}
        </Text>
      </Animated.View>
    </View>
  ) : (
    ""
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 50,
    left: 0,
    alignItems: "center",
    alignSelf: "center",
    zIndex: 100,
    elevation: 100,
    width: "100%",
  },
  toast: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: DEFAULT_BORDER_RADIUS,
    width: "85%",
    borderWidth: 0.5,
    flexDirection: "row",
  },
  message: {
    fontSize: 17,
    textAlign: "left",
  },
});
