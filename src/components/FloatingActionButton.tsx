import React from "react";
import {
  View,
  TouchableOpacity,
  Text,
  Animated,
  StyleSheet,
  type ViewStyle,
} from "react-native";

interface FloatingActionButtonProps {
  actions: {
    label: string;
    onPress: () => void;
    color?: string;
  }[];
  position?: "right" | "left";
  mainButtonColor?: string;
  mainIcon?: string;
  style?: ViewStyle;
}

export function FloatingActionButton({
  actions,
  position = "right",
  mainButtonColor = "#007AFF",
  mainIcon = "+",
  style,
}: FloatingActionButtonProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const animationValue = React.useRef(new Animated.Value(0)).current;
  const rotateValue = React.useRef(new Animated.Value(0)).current;

  const toggleMenu = () => {
    const toValue = isExpanded ? 0 : 1;

    Animated.parallel([
      Animated.spring(animationValue, {
        toValue,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }),
      Animated.spring(rotateValue, {
        toValue,
        useNativeDriver: true,
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
          useNativeDriver: true,
          friction: 8,
          tension: 40,
        }),
        Animated.spring(rotateValue, {
          toValue: 0,
          useNativeDriver: true,
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
        outputRange: [0, 1],
      });

      const opacity = animationValue.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 0, 1],
      });

      return (
        <Animated.View
          key={index}
          style={[
            styles.actionButtonContainer,
            {
              transform: [{ translateY }, { scale }],
              opacity,
              [position === "right" ? "right" : "left"]: 6,
              flexDirection: position === "right" ? "row" : "row-reverse",
            },
          ]}
        >
          <View
            style={[
              styles.labelContainer,
              position === "right" ? { marginRight: 10 } : { marginLeft: 10 },
            ]}
          >
            <Text style={styles.labelText}>{action.label}</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              action.onPress();
              closeMenu();
            }}
            style={[
              styles.actionButton,
              { backgroundColor: action.color || "#a6cfe0ff" },
            ]}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>{index + 1}</Text>
          </TouchableOpacity>
        </Animated.View>
      );
    });
  };

  return (
    <View style={[styles.container, style]} pointerEvents="box-none">
      {isExpanded && (
        <TouchableOpacity
          style={styles.overlay}
          onPress={closeMenu}
          activeOpacity={1}
        />
      )}

      <View
        style={[
          styles.buttonContainer,
          position === "right" ? { right: 20 } : { left: 20 },
        ]}
        pointerEvents="box-none"
      >
        {renderActionButtons()}

        <TouchableOpacity
          onPress={toggleMenu}
          style={[styles.mainButton, { backgroundColor: mainButtonColor }]}
          activeOpacity={0.9}
        >
          <Animated.Text
            style={[styles.mainIcon, { transform: [{ rotate: rotation }] }]}
          >
            {mainIcon}
          </Animated.Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
  buttonContainer: {
    position: "absolute",
    bottom: 60,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  mainButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  mainIcon: {
    fontSize: 28,
    fontWeight: "300",
    color: "#fff",
  },
  actionButtonContainer: {
    position: "absolute",
    bottom: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "flex-start"
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  labelContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  labelText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
