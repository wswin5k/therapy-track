import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

export default function SmallNumberStepper({ min = 1, max = 100, onChange }) {
  const [count, setCount] = useState(min);

  const handlePress = (type) => {
    let newValue = count;
    if (type === "increment" && count < max) {
      newValue = count + 1;
    } else if (type === "decrement" && count > min) {
      newValue = count - 1;
    }

    if (newValue !== count) {
      setCount(newValue);
      if (onChange) onChange(newValue);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => handlePress("decrement")}
        style={({ pressed }) => [
          styles.button,
          count === min && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.buttonText}>−</Text>
      </Pressable>

      <View style={styles.valueContainer}>
        <Text style={styles.valueText}>{count}</Text>
      </View>

      <Pressable
        onPress={() => handlePress("increment")}
        style={({ pressed }) => [
          styles.button,
          count === max && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.buttonText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    padding: 4,
    width: 150,
    justifyContent: "space-between",
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
  },
  pressed: {
    opacity: 0.7,
    backgroundColor: "#e0e0e0",
  },
  disabled: {
    opacity: 0.3,
    backgroundColor: "#f5f5f5",
  },
  buttonText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  valueContainer: {
    minWidth: 30,
    alignItems: "center",
  },
  valueText: {
    fontSize: 18,
    fontWeight: "600",
  },
});
