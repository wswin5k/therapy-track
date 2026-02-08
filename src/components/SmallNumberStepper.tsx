import React from "react";
import { View, Text, Pressable, StyleSheet, TextInput } from "react-native";

export default function SmallNumberStepper({ min = 1, max = 100, onChange }) {
  const [count, setCount] = React.useState<number>(min);

  const handlePress = (type) => {
    let newValue = count;
    if (type === "increment" && count < max) {
      newValue = count + 1.0;
    } else if (type === "decrement" && count > min) {
      newValue = count - 1.0;
    }

    if (newValue !== count) {
      setCount(newValue);
      if (onChange) onChange(newValue);
    }
  };

  const handleChangeText = (v: string) => {
    const parsed = parseFloat(v);
    if (isFinite(parsed) && !isNaN(parsed) && min < parsed && parsed < max) {
      setCount(parsed);
    } else {
      setCount(1.0);
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
        <TextInput
          keyboardType="numeric"
          defaultValue={count.toString()}
          onChangeText={handleChangeText}
          style={styles.valueText}
        />
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
