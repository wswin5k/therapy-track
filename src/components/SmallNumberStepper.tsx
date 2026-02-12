import React from "react";
import { View, Text, Pressable, StyleSheet, TextInput } from "react-native";
import { useTheme } from "@react-navigation/native";

type SmallNumberStepperProps = {
  min?: number;
  max?: number;
  defaultValue?: number;
  onChange: (value: number) => void;
};

export default function SmallNumberStepper({
  min = 1,
  max = 100,
  defaultValue = 1,
  onChange,
}: SmallNumberStepperProps) {
  const [count, setCount] = React.useState<number>(defaultValue);
  const theme = useTheme();

  const handlePress = (type: "increment" | "decrement") => {
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
    <View style={[styles.container, { backgroundColor: theme.colors.border }]}>
      <Pressable
        onPress={() => handlePress("decrement")}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: theme.colors.card },
          count === min && {
            opacity: 0.3,
            backgroundColor: theme.colors.background,
          },
          pressed && { opacity: 0.7, backgroundColor: theme.colors.border },
        ]}
      >
        <Text style={[styles.buttonText, { color: theme.colors.text }]}>−</Text>
      </Pressable>

      <View style={styles.valueContainer}>
        <TextInput
          keyboardType="numeric"
          defaultValue={count.toString()}
          onChangeText={handleChangeText}
          style={[styles.valueText, { color: theme.colors.text }]}
        />
      </View>

      <Pressable
        onPress={() => handlePress("increment")}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: theme.colors.card },
          count === max && {
            opacity: 0.3,
            backgroundColor: theme.colors.background,
          },
          pressed && { opacity: 0.7, backgroundColor: theme.colors.border },
        ]}
      >
        <Text style={[styles.buttonText, { color: theme.colors.text }]}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 4,
    width: 150,
    justifyContent: "space-between",
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
  },
  buttonText: {
    fontSize: 20,
    fontWeight: "bold",
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
