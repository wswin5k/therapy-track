import React from "react";
import {
  Animated,
  type ViewProps,
  type StyleProp,
  type ViewStyle,
  useAnimatedValue,
} from "react-native";

export const NOTIFICATION_FLICKER_TIMEOUT = 3000;

type FlickerViewProps = ViewProps & {
  flicker?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function FlickerView({
  flicker = false,
  style,
  ...props
}: FlickerViewProps) {
  const opacity = useAnimatedValue(1);

  React.useEffect(() => {
    if (!flicker) {
      opacity.setValue(1);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]),
      { iterations: 2 },
    );

    const startDelay = setTimeout(() => {
      animation.start();
    }, 500);

    const timeout = setTimeout(() => {
      animation.stop();
      opacity.setValue(1);
    }, NOTIFICATION_FLICKER_TIMEOUT);

    return () => {
      animation.stop();
      clearTimeout(startDelay);
      clearTimeout(timeout);
    };
  }, [flicker, opacity]);

  return <Animated.View {...props} style={[style, { opacity }]} />;
}
