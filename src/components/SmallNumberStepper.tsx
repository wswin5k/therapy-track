import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
} from "react-native";
import { useTheme } from "@react-navigation/native";

function isClose(a: number, b: number) {
  return Math.abs(a - b) < 1e-5;
}

type SmallNumberStepperProps = {
  min?: number;
  max?: number;
  defaultValue?: number;
  onChange: (value: number) => void;
};

export default function SmallNumberStepper({
  min = 0.25,
  max = 100,
  defaultValue = 1,
  onChange,
}: SmallNumberStepperProps) {
  const [count, setCount] = React.useState<number>(defaultValue);
  const theme = useTheme();

  const handlePress = (type: "increment" | "decrement") => {
    let newValue = count;
    if (type === "increment" && count < max) {
      if (newValue >= 1) {
        newValue = Math.floor(count + 1.0);
      } else if (count >= 0.75) {
        newValue = 1;
      } else if (count >= 0.5) {
        newValue = 0.75;
      } else if (count >= 0.25) {
        newValue = 0.5;
      } else {
        newValue = 1;
      }
    } else if (type === "decrement" && count > min) {
      if (newValue > 1) {
        newValue = Math.ceil(count - 1.0);
      } else if (count > 0.75) {
        newValue = 0.75;
      } else if (count > 0.5) {
        newValue = 0.5;
      } else if (count > 0.25) {
        newValue = 0.25;
      } else {
        newValue = 1;
      }
    }

    if (newValue !== count) {
      setCount(newValue);
      onChange(newValue);
    }
  };

  const handleChangeText = (v: string) => {
    const parsed = parseFloat(v);
    if (isFinite(parsed) && !isNaN(parsed) && min < parsed && parsed < max) {
      setCount(parsed);
      onChange(parsed);
    } else {
      setCount(1.0);
      onChange(1.0);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <Pressable
        onPress={() => handlePress("decrement")}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: theme.colors.card },
          isClose(count, min) && {
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
          defaultValue={
            count.toString()
          }
          onChangeText={handleChangeText}
          style={[styles.valueText, { color: theme.colors.text }]}
        />
      </View>

      <Pressable
        onPress={() => handlePress("increment")}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: theme.colors.card },
          isClose(count, max) && {
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
    borderWidth: 1,
    borderRadius: 8,
    padding: 4,
    justifyContent: "space-between",
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
  },
  buttonText: {
    fontSize: 20,
    fontWeight: "500",
  },
  valueContainer: {
    minWidth: 30,
    alignItems: "center",
  },
  valueText: {
    fontSize: 18,
    fontWeight: "500",
  },
});
