import React from "react";
import {
  Animated,
  type ViewProps,
  type StyleProp,
  type ViewStyle,
  useAnimatedValue,
} from "react-native";

type FlickerViewProps = ViewProps & {
  /**
   * Flicker for 2 seconds after mounting.
   * Defaults to false.
   */
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
          toValue: 0.4,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
      ]),
      { iterations: 10 },
    );

    animation.start();

    const timeout = setTimeout(() => {
      animation.stop();
      opacity.setValue(1);
    }, 400);

    return () => {
      animation.stop();
      clearTimeout(timeout);
    };
  }, [flicker, opacity]);

  return <Animated.View {...props} style={[style, { opacity }]} />;
}
