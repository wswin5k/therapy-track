import React from "react";
import { useTranslation } from "react-i18next";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import RNDateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";

enum Frequency {
  OnceDaily = "once daily",
  TwiceDaily = "two times a day",
  OnceWeekly = "one time a week",
}

export function AddScheduleScreen() {
  const { t, i18n } = useTranslation();
  const [isStartDatePickerOpened, setIsStartDatePickerOpened] =
    React.useState<boolean>(false);
  const [startDate, setStartDate] = React.useState<Date | null>(null);
  const [isEndDatePickerOpened, setIsEndDatePickerOpened] =
    React.useState<boolean>(false);
  const [endDate, setEndDate] = React.useState<Date | null>(null);

  const handleSelectStartDate = () => {
    setIsStartDatePickerOpened(true);
  };

  const handleStartDateChange = (event: DateTimePickerEvent, date?: Date) => {
    console.log(event.type);
    if (date) {
      setStartDate(date);
    }
    setIsStartDatePickerOpened(false);
  };

  const handleSelectEndDate = () => {
    setIsEndDatePickerOpened(true);
  };

  const handleEndDateChange = (event: DateTimePickerEvent, date?: Date) => {
    console.log(event.type);
    if (date) {
      setEndDate(date);
    }
    setIsEndDatePickerOpened(false);
  };

  const handleSave = () => {};

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.headerLabel}>{t("Schedule")}</Text>

        <Text style={styles.headerLabel}>{t("Frequency")}</Text>
        <View style={styles.fullWidthPickerContainer}>
          <Picker style={styles.picker}>
            {Object.values(Frequency).map((unit) => (
              <Picker.Item
                label={unit}
                value={unit}
                style={styles.pickerItem}
              />
            ))}
          </Picker>
        </View>

        <Text style={styles.headerLabel}>{t("Dose")}</Text>

        <Text style={styles.headerLabel}>{t("Start date")}</Text>
        <TouchableOpacity onPress={handleSelectStartDate} style={styles.input}>
          <Text style={styles.inputText}>
            {startDate ? startDate.toDateString() : "Select date"}
          </Text>
        </TouchableOpacity>
        {isStartDatePickerOpened ? (
          <RNDateTimePicker
            mode="date"
            value={new Date()}
            onChange={handleStartDateChange}
          />
        ) : (
          ""
        )}

        <Text style={styles.headerLabel}>{t("End date")}</Text>
        <TouchableOpacity onPress={handleSelectEndDate} style={styles.input}>
          <Text style={styles.inputText}>
            {endDate ? endDate.toDateString() : "Select date"}
          </Text>
        </TouchableOpacity>
        {isEndDatePickerOpened ? (
          <RNDateTimePicker
            mode="date"
            value={new Date()}
            onChange={handleEndDateChange}
          />
        ) : (
          ""
        )}

        <Text style={styles.headerLabel}>{t("That's 2 weeks")}</Text>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity onPress={handleSave} style={styles.nextButton}>
          <Text style={styles.nextButtonText}>{t("Save")}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  headerLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  input: {
    height: 50,
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: "center",
    marginBottom: 10,
  },
  inputText: {
    fontSize: 16,
    color: "#333",
  },
  fullWidthPickerContainer: {
    height: 50,
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    justifyContent: "center",
    marginBottom: 15,
  },
  picker: {
    width: "100%",
    height: 50,
  },
  pickerItem: {
    fontSize: 16,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  nextButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
