import React from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Button } from "@react-navigation/elements";
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
    <SafeAreaView style={styles.mainFlow}>
      <Text>Schedule</Text>

      <View style={styles.row}>
        <Text>{t("Frequency")}</Text>
        <Picker style={[{ width: "50%" }]}>
          {Object.values(Frequency).map((unit) => (
            <Picker.Item label={unit} value={unit} />
          ))}
        </Picker>
      </View>

      <Text>Dose</Text>

      <Text>Start date</Text>
      <Button onPress={handleSelectStartDate}>
        {startDate ? startDate.toDateString() : "Select date"}
      </Button>
      {isStartDatePickerOpened ? (
        <RNDateTimePicker
          mode="date"
          value={new Date()}
          onChange={handleStartDateChange}
        />
      ) : (
        ""
      )}

      <Text>End date</Text>
      <Button onPress={handleSelectEndDate}>
        {endDate ? endDate.toDateString() : "Select date"}
      </Button>
      {isEndDatePickerOpened ? (
        <RNDateTimePicker
          mode="date"
          value={new Date()}
          onChange={handleEndDateChange}
        />
      ) : (
        ""
      )}

      <Text>That's 2 weeks</Text>

      <Button onPress={handleSave}>Save</Button>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainFlow: {
    flexDirection: "column",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    padding: 10,
  },
  mainFontSize: {
    fontSize: 20,
  },
  input: {
    fontSize: 20,
    margin: 12,
    borderWidth: 1,
    padding: 10,
    borderRadius: 7,
  },
});
