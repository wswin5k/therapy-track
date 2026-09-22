import React from "react";
import {
  View,
  TouchableOpacity,
  Text,
  Animated,
  StyleSheet,
  type ViewStyle,
  useAnimatedValue,
  Pressable,
} from "react-native";
import { useTheme } from "@react-navigation/native";

interface FloatingActionButtonProps {
  actions: {
    label: string;
    onPress: () => void;
  }[];
  mainIcon?: string;
  style?: ViewStyle;
}

// on Android native driver doesn't allow clicks mid-animation
const ANIMATION_USE_NATIVE_DRIVER = false;

export function FloatingActionButton({
  actions,
  mainIcon = "＋",
  style,
}: FloatingActionButtonProps) {
  const theme = useTheme();
  const [isExpanded, setIsExpanded] = React.useState(false);
  const animationValue = useAnimatedValue(0);
  const rotateValue = useAnimatedValue(0);

  const toggleMenu = () => {
    const toValue = isExpanded ? 0 : 1;

    Animated.parallel([
      Animated.spring(animationValue, {
        toValue,
        useNativeDriver: ANIMATION_USE_NATIVE_DRIVER,
        friction: 8,
        tension: 40,
      }),
      Animated.spring(rotateValue, {
        toValue,
        useNativeDriver: ANIMATION_USE_NATIVE_DRIVER,
        friction: 8,
        tension: 40,
      }),
    ]).start();

    setIsExpanded(!isExpanded);
  };

  const closeMenu = () => {
    if (isExpanded) {
      Animated.parallel([
        Animated.spring(animationValue, {
          toValue: 0,
          useNativeDriver: ANIMATION_USE_NATIVE_DRIVER,
          friction: 8,
          tension: 40,
        }),
        Animated.spring(rotateValue, {
          toValue: 0,
          useNativeDriver: ANIMATION_USE_NATIVE_DRIVER,
          friction: 8,
          tension: 40,
        }),
      ]).start();
      setIsExpanded(false);
    }
  };

  const rotation = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "45deg"],
  });

  const renderActionButtons = () => {
    return actions.map((action, index) => {
      const translateY = animationValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -80 * (index + 1)],
      });

      const scale = animationValue.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1],
      });

      const opacity = animationValue.interpolate({
        inputRange: [0.0, 0.5, 1],
        outputRange: [0.0, 0.0, 1],
      });

      return (
        <Animated.View
          key={index}
          pointerEvents={isExpanded ? "auto" : "none"}
          style={[
            styles.actionButtonContainer,
            {
              transform: [{ translateY }, { scale }],
              opacity,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => {
              action.onPress();
              closeMenu();
            }}
            style={[
              styles.actionButton,
              { backgroundColor: theme.colors.primary },
            ]}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.actionButtonText,
                { color: theme.colors.textOnPrimary },
              ]}
            >
              {action.label}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      );
    });
  };

  return (
    <View style={[styles.container, style]}>
      {isExpanded && (
        <Pressable style={styles.overlay} onPress={closeMenu}></Pressable>
      )}

      <View style={[styles.fabLayer]}>
        {renderActionButtons()}
        <TouchableOpacity
          onPress={toggleMenu}
          style={[styles.mainButton, { backgroundColor: theme.colors.primary }]}
          activeOpacity={0.9}
        >
          <Animated.Text
            style={[
              styles.mainIcon,
              { color: theme.colors.textOnPrimary },
              { transform: [{ rotate: rotation }] },
            ]}
          >
            {mainIcon}
          </Animated.Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const SHADOW_PROPS = {
  elevation: 3,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 3,
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
    pointerEvents: "box-none",
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 2,
    backgroundColor: "transparent",
  },
  fabLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 3,
    pointerEvents: "box-none",
    position: "absolute",
    bottom: 16,
    right: 16,
    flexDirection: "column",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    overflow: "visible",
  },
  buttonContainer: {
    position: "absolute",
    bottom: 16,
    right: 16,
    flexDirection: "column",
    alignItems: "flex-end",
  },
  mainButton: {
    width: 60,
    height: 60,
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOW_PROPS,
  },
  mainIcon: {
    fontSize: 24,
    fontWeight: "600",
  },
  actionButtonContainer: {
    position: "absolute",
    bottom: 0,
    right: 0,
  },
  actionButton: {
    height: 54,
    borderRadius: 100,
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOW_PROPS,
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: "500",
  },
});
